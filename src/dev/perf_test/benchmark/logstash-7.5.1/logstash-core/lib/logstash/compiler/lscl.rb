# encoding: utf-8
require "treetop"
require "logstash/compiler/treetop_monkeypatches"
require "logstash/compiler/lscl/helpers"
require "logstash/config/string_escape"
require "logstash/util"

java_import org.logstash.config.ir.DSL
java_import org.logstash.common.SourceWithMetadata

module LogStashCompilerLSCLGrammar; module LogStash; module Compiler; module LSCL; module AST
  PROCESS_ESCAPE_SEQUENCES = :process_escape_sequences

    class Node < Treetop::Runtime::SyntaxNode
    include Helpers

    def section_type
      if recursive_select_parent(Plugin).any?
        return "codec"
      else
        section = recursive_select_parent(PluginSection)
        return section.first.plugin_type.text_value
      end
    end
  end

  class Config < Node
    include Helpers

    def process_escape_sequences=(val)
      set_meta(PROCESS_ESCAPE_SEQUENCES, val)
    end

    def compile(base_source_with_metadata=nil)
      # There is no way to move vars across nodes in treetop :(
      self.base_source_with_metadata = base_source_with_metadata

      sections = recursive_select(PluginSection)

      section_map = {
        :input  => [],
        :filter => [],
        :output => []
      }

      sections.each do |section|
        section_name = section.plugin_type.text_value.to_sym
        section_expr = section.expr
        raise "Unknown section name #{section_name}!" if ![:input, :output, :filter].include?(section_name)
        ::Array[section_expr].each do |se|
          section_map[section_name].concat se
        end
      end

      compiled_section_map = {}
      section_map.keys.each do |key|
        compiled_section_map[key] = compose_for(key).call(*section_map[key])
      end

      compiled_section_map
    end
  end

  class Comment < Node; end
  class Whitespace < Node; end

  class PluginSection < Node
    def expr
      recursive_select(Branch, Plugin).map(&:expr)
    end
  end

  class Plugins < Node; end
  class Plugin < Node
    def expr
      jdsl.iPlugin(source_meta, plugin_type_enum, self.plugin_name, self.expr_attributes)
    end

    def plugin_type_enum
      case section_type
      when "input"
        Java::OrgLogstashConfigIr::PluginDefinition::Type::INPUT
      when "codec"
        Java::OrgLogstashConfigIr::PluginDefinition::Type::CODEC
      when "filter"
        Java::OrgLogstashConfigIr::PluginDefinition::Type::FILTER
      when "output"
        Java::OrgLogstashConfigIr::PluginDefinition::Type::OUTPUT
      end
    end

    def plugin_name
      return name.text_value
    end

    def expr_attributes
      # Turn attributes into a hash map
      self.attributes.recursive_select(Attribute).map(&:expr).map {|k,v|
        if v.java_kind_of?(Java::OrgLogstashConfigIrExpression::ValueExpression)
          [k, v.get]
        else
          [k,v]
        end
      }.reduce({}) do |hash, kv|
        k, v = kv
        existing = hash[k]
        if existing.nil?
          hash[k] = v
        elsif existing.kind_of?(::Hash)
          # For legacy reasons, a config can contain multiple `AST::Attribute`s with the same name
          # and a hash-type value (e.g., "match" in the grok filter), which are merged into a single
          # hash value; e.g., `{"match" => {"baz" => "bar"}, "match" => {"foo" => "bulb"}}` is
          # interpreted as `{"match" => {"baz" => "bar", "foo" => "blub"}}`.
          # (NOTE: this bypasses `AST::Hash`'s ability to detect duplicate keys)
          hash[k] = ::LogStash::Util.hash_merge_many(existing, v)
        elsif existing.kind_of?(::Array)
          hash[k] = existing.push(*v)
        else
          hash[k] = [existing, v] unless v == existing
        end
        hash
      end
    end
  end

  class Name < Node
    def expr
      return text_value
    end
  end

  class Attribute < Node
    def expr
      [name.text_value, value.expr]
    end
  end

  class RValue < Node; end
  class Value < RValue; end

  class Bareword < Value
    def expr
      jdsl.eValue(source_meta, text_value)
    end
  end

  class String < Value
    def expr
      value = if get_meta(PROCESS_ESCAPE_SEQUENCES)
        ::LogStash::Config::StringEscape.process_escapes(text_value[1...-1])
      else
        text_value[1...-1]
      end
      jdsl.eValue(source_meta, value)
    end
  end

  class RegExp < Value
    def expr
      # Strip the slashes off
      jdsl.eRegex(text_value[1..-2])
    end
  end

  class Number < Value
    def expr
      jdsl.eValue(source_meta, text_value.include?(".") ?
                                   Float(text_value) :
                                   Integer(text_value))
    end
  end

  class Array < Value
    def expr
      jdsl.eValue(source_meta, recursive_select(Value).map(&:expr).map(&:get))
    end
  end

  class Hash < Value
    def validate!
      duplicate_values = find_duplicate_keys

      if duplicate_values.size > 0
        raise ::LogStash::ConfigurationError.new(
          I18n.t("logstash.runner.configuration.invalid_plugin_settings_duplicate_keys",
            :keys => duplicate_values.join(', '),
            :line => input.line_of(interval.first),
            :column => input.column_of(interval.first),
            :byte => interval.first + 1,
            :after => input[0..interval.first]
          )
        )
      end
    end

    def find_duplicate_keys
      values = recursive_select(HashEntry).collect { |hash_entry| hash_entry.name.text_value }
      values.find_all { |v| values.count(v) > 1 }.uniq
    end

    def expr
      validate!
      jdsl.eValue(source_meta, ::Hash[recursive_select(HashEntry).map(&:expr)])
    end
  end

  class HashEntries < Node; end

  class HashEntry < Node
    def expr
      return [name.expr.get, value.expr.get()]
    end
  end

  class Branch < Node
    def expr
      # Build this stuff as s-expressions for convenience at first
      # This will turn if/elsif/else blocks into nested if/else trees

      exprs = []
      else_stack = [] # For turning if / elsif / else into nested ifs

      self.recursive_select(Plugin, If, Elsif, Else).each do |node|
        if node.is_a?(If)
          exprs << :if
          exprs << expr_cond(node)
          exprs << expr_body(node)
        elsif node.is_a?(Elsif)
          condition = expr_cond(node)
          body = expr_body(node)
          else_stack << [:if, condition, body]
        elsif node.is_a?(Else)
          body = expr_body(node)
          if else_stack.size >= 1
            else_stack.last << body
          else
            exprs << body
          end
        end
      end

      else_stack.reverse.each_cons(2) do |cons|
        later,earlier = cons
        earlier << later
      end
      exprs << else_stack.first

      # Then convert to the imperative java IR
      javaify_sexpr(exprs)
    end

    def javaify_sexpr(sexpr)
      return nil if sexpr.nil?

      head, tail = sexpr.first
      tail = sexpr[1..-1]

      if head == :if
        condition, t_branch, f_branch = tail

        java_t_branch = t_branch && javaify_sexpr(t_branch)
        java_f_branch = f_branch && javaify_sexpr(f_branch)

        if java_t_branch || java_f_branch
          # We use the condition as the source with metadata because it hashes correctly
          # It's hard to use the 'real' source due to the re-branching from if / elsif into if/else only
          # branches. We should come back and improve this at some point if that makes a difference
          jdsl.iIf(condition.source_with_metadata, condition, java_t_branch || jdsl.noop, java_f_branch || jdsl.noop)
        else
          jdsl.noop()
        end
      elsif head == :compose
        tail && tail.size > 0 ? compose(*tail) : jdsl.noop
      else
        raise "Unknown expression #{sexpr}!"
      end
    end

    def expr_cond(node)
      node.elements.find {|e| e.is_a?(Condition)}.expr
    end

    def expr_body(node)
      [:compose, *node.recursive_select(Plugin, Branch).map(&:expr)]
    end
  end

  # Branch covers all these
  class BranchEntry < Node; end
  class If < BranchEntry; end
  class Elsif < BranchEntry; end
  class Else < BranchEntry; end

  class Condition < Node
    include Helpers

    def expr
      first_element = elements.first
      rest_elements = elements.size > 1 ? elements[1].recursive_select(BooleanOperator, Expression, SelectorElement) : []

      all_elements = [first_element, *rest_elements]


      res = if all_elements.size == 1
        elem = all_elements.first
        if elem.is_a?(Selector)
          jdsl.eTruthy(source_meta, elem.expr)
        elsif elem.is_a?(RegexpExpression)
          elem.expr
        else
          join_conditions(all_elements)
        end
      else
        join_conditions(all_elements)
      end
      res
    end

    def precedence(op)
      #  Believe this is right for logstash?
      if op == AND_METHOD
        2
      elsif op == OR_METHOD
        1
      else
        raise ArgumentError, "Unexpected operator #{op}"
      end
    end

    # Converts an sexpr of :and or :or to the java imperative IR
    def jconvert(sexpr)
      raise "jconvert cannot handle nils!" if sexpr.nil?

      if sexpr.java_kind_of?(Java::OrgLogstashConfigIrExpression::Expression)
        return sexpr
      end

      op, left, right = sexpr

      left_c = jconvert(left)
      right_c = jconvert(right)

      case op
      when :and
        return jdsl.eAnd(source_meta, left, right);
      when :nand
        return jdsl.eNand(source_meta, left, right);
      when :or
        return jdsl.eOr(source_meta, left, right);
      when :xor
        return jdsl.eXor(source_meta, left, right);
      else
        raise "Unknown op #{jop}"
      end
    end

    def join_conditions(all_elements)
      # Use Dijkstra's shunting yard algorithm
      out = []
      operators = []

      all_elements.each do |e|
        e_exp = e.expr

        if e.is_a?(BooleanOperator)
          if operators.last && precedence(operators.last) > precedence(e_exp)
            out << operators.pop
          end
          operators << e_exp
        else
          out << e_exp
        end
      end
      operators.reverse.each {|o| out << o}

      stack = []
      expr = []
      out.each do |e|
        if e.is_a?(Symbol)
          rval, lval = stack.pop, stack.pop
          stack << jconvert([e, lval, rval])
        elsif e.nil?
          raise "Nil expr encountered! This should not happen!"
        else
          stack << e
        end
      end

      stack_to_expr(stack)
    end

    def stack_to_expr(stack)
      raise "Got an empty stack! This should not happen!" if stack.empty?
      stack = stack.reverse # We need to work the stack in reverse order

      working_stack = []
      while elem = stack.pop
        if elem.is_a?(::Method)
          right, left = working_stack.pop, working_stack.pop
          working_stack << elem.call(source_meta, left, right)
        else
          working_stack << elem
        end
      end

      raise "Invariant violated! Stack size > 1" if working_stack.size > 1

      working_stack.first
    end
  end

  module Expression
    def expr
      # If we have a more specific type (like a Negative expression) use that
      if defined?(super)
        return super
      end

      exprs = self.recursive_select(Condition, Selector).map(&:expr)

      raise "Exprs should only have one part!" if exprs.size != 1
      exprs.first
    end
  end

  module NegativeExpression
    include Helpers

    def expr
      exprs = self.recursive_select(Condition, Selector).map(&:expr)
      raise "Negative exprs should only have one part!" if exprs.size != 1
      jdsl.eNot(source_meta, exprs.first)
    end
  end

  module ComparisonExpression
    include Helpers

    def expr
      lval, comparison_method, rval = self.recursive_select(Selector, Expression, ComparisonOperator, Number, String).map(&:expr)
      comparison_method.call(source_meta, lval, rval)
    end
  end

  module InExpression
    include Helpers

    def expr
      item, list = recursive_select(RValue)
      jdsl.eIn(source_meta, item.expr, list.expr)
    end
  end

  module NotInExpression
    include Helpers

    def expr
      item, list = recursive_select(RValue)
      jdsl.eNot(source_meta, jdsl.eIn(item.expr, list.expr))
    end
  end

  # Not implemented because no one uses this
  class MethodCall < Node; end

  class RegexpExpression < Node
    def expr
      selector, operator_method, regexp = recursive_select(
        Selector,
        LogStash::Compiler::LSCL::AST::RegExpOperator,
        LogStash::Compiler::LSCL::AST::RegExp,
        LogStash::Compiler::LSCL::AST::String # Strings work as rvalues! :p
      ).map(&:expr)

      # Handle string rvalues, they just get turned into regexps
      # Maybe we really shouldn't handle these anymore...
      if regexp.class == org.logstash.config.ir.expression.ValueExpression
        regexp = jdsl.eRegex(source_meta, regexp.get)
      end

      raise "Expected a selector in #{text_value}!" unless selector
      raise "Expected a regexp in #{text_value}!" unless regexp

      operator_method.call(source_meta, selector, regexp)
    end
  end

  module BranchOrPlugin; end

  module ComparisonOperator
    include Helpers

    def expr
      case self.text_value
      when "=="
        jdsl.method(:eEq)
      when "!="
        jdsl.method(:eNeq)
      when ">"
        jdsl.method(:eGt)
      when "<"
        jdsl.method(:eLt)
      when ">="
        jdsl.method(:eGte)
      when "<="
        jdsl.method(:eLte)
      else
        raise "Unknown operator #{self.text_value}"
      end
    end
  end

  module RegExpOperator
    include Helpers

    def expr
      if self.text_value == '!~'
        jdsl.java_method(:eRegexNeq, [org.logstash.common.SourceWithMetadata, org.logstash.config.ir.expression.Expression, org.logstash.config.ir.expression.ValueExpression])
      elsif self.text_value == '=~'
        jdsl.java_method(:eRegexEq, [org.logstash.common.SourceWithMetadata, org.logstash.config.ir.expression.Expression, org.logstash.config.ir.expression.ValueExpression])
      else
        raise "Unknown regex operator #{self.text_value}"
      end
    end
  end

  module BooleanOperator
    include Helpers

    def expr
      case self.text_value
      when "and"
        AND_METHOD
      when "nand"
        NAND_METHOD
      when "or"
        OR_METHOD
      when "xor"
        XOR_METHOD
      else
        raise "Unknown operator #{self.text_value}"
      end
    end
  end

  class Selector < RValue
    def expr
      jdsl.eEventValue(source_meta, text_value)
    end
  end

  class SelectorElement < Node;
    def expr
      jdsl.eEventValue(source_meta, text_value)
    end
  end
end; end; end; end; end;
