# frozen-string-literal: true
#
# This adds a <tt>Sequel::Dataset#to_dot</tt> method.  The +to_dot+ method
# returns a string that can be processed by graphviz's +dot+ program in
# order to get a visualization of the dataset.  Basically, it shows a version
# of the dataset's abstract syntax tree.
#
# To load the extension:
#
#   Sequel.extension :to_dot
#
# Related module: Sequel::ToDot

#
module Sequel
  class ToDot
    module DatasetMethods
      # Return a string that can be processed by the +dot+ program (included
      # with graphviz) in order to see a visualization of the dataset's
      # abstract syntax tree.
      def to_dot
        ToDot.output(self)
      end
    end

    # The option keys that should be included in the dot output.
    TO_DOT_OPTIONS = [:with, :distinct, :select, :from, :join, :where, :group, :having, :compounds, :order, :limit, :offset, :lock].freeze

    # Given a +Dataset+, return a string in +dot+ format that will
    # generate a visualization of the dataset.
    def self.output(ds)
      new(ds).output
    end

    # Given a +Dataset+, parse the internal structure to generate
    # a dataset visualization.
    def initialize(ds)
      @i = 0
      @stack = [@i]
      @dot = ["digraph G {", "0 [label=\"self\"];"]
      v(ds, "")
      @dot << "}"
    end

    # Output the dataset visualization as a string in +dot+ format.
    def output
      @dot.join("\n")
    end

    private

    # Add an entry to the +dot+ output with the given label.  If +j+
    # is given, it is used directly as the node or transition.  Otherwise
    # a node is created for the current object.
    def dot(label, j=nil)
      @dot << "#{j||@i} [label=#{label.to_s.inspect}];"
    end

    # Recursive method that parses all of Sequel's internal datastructures,
    # adding the appropriate nodes and transitions to the internal +dot+
    # structure.
    def v(e, l)
      @i += 1
      dot(l, "#{@stack.last} -> #{@i}") if l
      @stack.push(@i)
      case e
      when LiteralString
        dot "Sequel.lit(#{e.to_s.inspect})"
      when Symbol, Numeric, String, Class, TrueClass, FalseClass, NilClass
        dot e.inspect
      when Array
        dot "Array"
        e.each_with_index do |val, j|
          v(val, j)
        end
      when Hash
        dot "Hash"
        e.each do |k, val|
          v(val, k)
        end
      when SQL::ComplexExpression 
        dot "ComplexExpression: #{e.op}"
        e.args.each_with_index do |val, j|
          v(val, j)
        end
      when SQL::Identifier
        dot "Identifier"
        v(e.value, :value)
      when SQL::QualifiedIdentifier
        dot "QualifiedIdentifier"
        v(e.table, :table)
        v(e.column, :column)
      when SQL::OrderedExpression
        dot "OrderedExpression: #{e.descending ? :DESC : :ASC}#{" NULLS #{e.nulls.to_s.upcase}" if e.nulls}"
        v(e.expression, :expression)
      when SQL::AliasedExpression
        dot "AliasedExpression"
        v(e.expression, :expression)
        v(e.alias, :alias)
        v(e.columns, :columns) if e.columns
      when SQL::CaseExpression
        dot "CaseExpression"
        v(e.expression, :expression) if e.expression
        v(e.conditions, :conditions)
        v(e.default, :default)
      when SQL::Cast
        dot "Cast"
        v(e.expr, :expr)
        v(e.type, :type)
      when SQL::Function
        dot "Function: #{e.name}"
        e.args.each_with_index do |val, j|
          v(val, j)
        end
        v(e.args, :args)
        v(e.opts, :opts)
      when SQL::Subscript 
        dot "Subscript"
        v(e.f, :f)
        v(e.sub, :sub)
      when SQL::Window
        dot "Window"
        v(e.opts, :opts)
      when SQL::PlaceholderLiteralString
        str = e.str
        str = "(#{str})" if e.parens
        dot "PlaceholderLiteralString: #{str.inspect}"
        v(e.args, :args)
      when SQL::JoinClause
        str = "#{e.join_type.to_s.upcase} JOIN".dup
        if e.is_a?(SQL::JoinOnClause)
          str << " ON"
        elsif e.is_a?(SQL::JoinUsingClause)
          str << " USING"
        end
        dot str
        v(e.table_expr, :table)
        if e.is_a?(SQL::JoinOnClause)
          v(e.on, :on) 
        elsif e.is_a?(SQL::JoinUsingClause)
          v(e.using, :using) 
        end
      when Dataset
        dot "Dataset"
        TO_DOT_OPTIONS.each do |k|
          if val = e.opts[k]
            v(val, k.to_s) 
          end
        end
      else
        dot "Unhandled: #{e.inspect}"
      end
      @stack.pop
    end
  end

  Dataset.register_extension(:to_dot, ToDot::DatasetMethods)
end
