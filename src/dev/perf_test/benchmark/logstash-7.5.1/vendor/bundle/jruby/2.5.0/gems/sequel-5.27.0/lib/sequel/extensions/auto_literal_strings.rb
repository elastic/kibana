# frozen-string-literal: true
#
# The auto_literal_strings extension treats string values passed as filter
# arguments as SQL query fragments.  This is the behavior of previous
# versions of Sequel.  Using this extension makes using raw SQL fragments
# easier, since you don't need to wrap them with Sequel.lit, but also makes
# it easier to introduce SQL injection vulnerabilities into the application.
# It is only recommended to use this extension for
# backwards compatibility with previous versions of Sequel.
#
# With this extension, if a single string is given, it is used as an SQL
# query fragment:
#
#   ds = DB[:table].extension(:auto_literal_strings)
#   ds.where("name > 'A'")
#   # SELECT * FROM table WHERE (name > 'A')
#
# If additional arguments are given, they are used as placeholders:
#
#   ds.where("name > ?", "A")
#   # SELECT * FROM table WHERE (name > 'A')
#
# Named placeholders can also be used with a hash:
#
#   ds.where("name > :a", :a=>"A")
#   # SELECT * FROM table WHERE (name > 'A')
#
# This extension also allows the use of a plain string passed to Dataset#update:
#
#   ds.update("column = column + 1")
#   # UPDATE table SET column = column + 1
#
# Related module: Sequel::Dataset::AutoLiteralStrings

#
module Sequel
  class Dataset
    module AutoLiteralStrings
      # Treat plain strings as literal strings, and arrays where the first element
      # is a string as a literal string with placeholders.
      def filter_expr(expr = nil)
        case expr
        when LiteralString
          super
        when String
          super(LiteralString.new(expr))
        when Array
          if (sexpr = expr.first).is_a?(String)
            super(SQL::PlaceholderLiteralString.new(sexpr, expr[1..-1], true))
          else
            super
          end
        else
          super
        end
      end

      # Treat plain strings as literal strings.
      def update_sql(values=OPTS)
        case values
        when LiteralString
          super
        when String
          super(LiteralString.new(values))
        else
          super
        end
      end
    end

    register_extension(:auto_literal_strings, AutoLiteralStrings)
  end
end

