# frozen-string-literal: true
#
# The eval_inspect extension changes #inspect for Sequel::SQL::Expression
# subclasses to return a string suitable for ruby's eval, such that
#
#   eval(obj.inspect) == obj
#
# is true.  The above code is true for most of ruby's simple classes such
# as String, Integer, Float, and Symbol, but it's not true for classes such
# as Time, Date, and BigDecimal.  Sequel attempts to handle situations where
# instances of these classes are a component of a Sequel expression.
#
# To load the extension:
#
#   Sequel.extension :eval_inspect
#
# Related module: Sequel::EvalInspect

#
module Sequel
  module EvalInspect
    # Special case objects where inspect does not generally produce input
    # suitable for eval.  Used by Sequel::SQL::Expression#inspect so that
    # it can produce a string suitable for eval even if components of the
    # expression have inspect methods that do not produce strings suitable
    # for eval.
    def eval_inspect(obj)
      case obj
      when BigDecimal
        "Kernel::BigDecimal(#{obj.to_s.inspect})"
      when Sequel::SQL::Blob, Sequel::LiteralString
        "#{obj.class}.new(#{obj.to_s.inspect})"
      when Sequel::SQL::ValueList
        "#{obj.class}.new(#{obj.to_a.inspect})"
      when Array
        "[#{obj.map{|o| eval_inspect(o)}.join(', ')}]"
      when Hash
        "{#{obj.map{|k, v| "#{eval_inspect(k)} => #{eval_inspect(v)}"}.join(', ')}}"
      when Time
        datepart = "%Y-%m-%dT" unless obj.is_a?(Sequel::SQLTime)
        "#{obj.class}.parse(#{obj.strftime("#{datepart}%T.%N%z").inspect})#{'.utc' if obj.utc?}"
      when DateTime
        # Ignore date of calendar reform
        "DateTime.parse(#{obj.strftime('%FT%T.%N%z').inspect})"
      when Date
        # Ignore offset and date of calendar reform
        "Date.new(#{obj.year}, #{obj.month}, #{obj.day})"
      else
        obj.inspect
      end
    end
  end

  extend EvalInspect

  module SQL
    class Expression
      # Attempt to produce a string suitable for eval, such that:
      #
      #   eval(obj.inspect) == obj
      def inspect
        # Assume by default that the object can be recreated by calling
        # self.class.new with any attr_reader values defined on the class,
        # in the order they were defined.
        klass = self.class
        args = inspect_args.map do |arg|
          if arg.is_a?(String) && arg =~ /\A\*/
            # Special case string arguments starting with *, indicating that
            # they should return an array to be splatted as the remaining arguments.
            # Allow calling private methods to get inspect output.
            send(arg.sub('*', '')).map{|a| Sequel.eval_inspect(a)}.join(', ')
          else
            # Allow calling private methods to get inspect output.
            Sequel.eval_inspect(send(arg))
          end
        end
        "#{klass}.#{inspect_new_method}(#{args.join(', ')})"
      end

      private

      # Which attribute values to use in the inspect string.
      def inspect_args
        self.class.comparison_attrs
      end

      # Use the new method by default for creating new objects.
      def inspect_new_method
        :new
      end
    end

    class ComplexExpression
      private

      # ComplexExpression's initializer uses a splat for the operator arguments.
      def inspect_args
        [:op, "*args"]
      end
    end

    class Constant
      # Constants to lookup in the Sequel module.
      INSPECT_LOOKUPS = [:CURRENT_DATE, :CURRENT_TIMESTAMP, :CURRENT_TIME, :SQLTRUE, :SQLFALSE, :NULL, :NOTNULL]

      # Reference the constant in the Sequel module if there is
      # one that matches.
      def inspect
        INSPECT_LOOKUPS.each do |c|
          return "Sequel::#{c}" if Sequel.const_get(c) == self
        end
        super
      end
    end

    class CaseExpression
      private

      # CaseExpression's initializer checks whether an argument was
      # provided, to differentiate CASE WHEN from CASE NULL WHEN, so
      # check if an expression was provided, and only include the
      # expression in the inspect output if so.
      def inspect_args
        if expression?
          [:conditions, :default, :expression]
        else
          [:conditions, :default]
        end
      end
    end

    class Function
      private

      # Function uses a new! method for creating functions with options,
      # since Function.new does not allow for an options hash.
      def inspect_new_method
        :new!
      end
    end

    class JoinOnClause
      private

      # JoinOnClause's initializer takes the on argument as the first argument
      # instead of the last.
      def inspect_args
        [:on, :join_type, :table_expr] 
      end
    end

    class JoinUsingClause
      private

      # JoinOnClause's initializer takes the using argument as the first argument
      # instead of the last.
      def inspect_args
        [:using, :join_type, :table_expr] 
      end
    end

    class OrderedExpression
      private

      # OrderedExpression's initializer takes the :nulls information inside a hash,
      # so if a NULL order was given, include a hash with that information.
      def inspect_args
        if nulls
          [:expression, :descending, :opts_hash]
        else
          [:expression, :descending]
        end
      end

      # A hash of null information suitable for passing to the initializer.
      def opts_hash
        {:nulls=>nulls} 
      end
    end
  end
end
