# frozen-string-literal: true
#
# The escaped_like extension adds +escaped_like+ and +escaped_ilike+
# methods to Sequel::SQL::StringMethods, which allow them to be easily
# used with most of Sequel's expression objects.  Example:
#
#   DB[:table].where{string_column.escaped_like('?%', user_input)}
#   # user_input is 'foo':
#   #  SELECT * FROM table WHERE string_column LIKE 'foo%' ESCAPE '\'
#   # user_input is '%foo':
#   #  SELECT * FROM table WHERE string_column LIKE '\%foo%' ESCAPE '\'
#
# To load the extension:
#
#   Sequel.extension :escaped_like
#
# Related modules: Sequel::SQL::StringMethods, Sequel::SQL::EscapedLikeExpression

#
module Sequel
  module SQL
    # Represents an pattern match SQL expression, where the pattern can depend
    # upon interpolated values in a database-dependent manner.
    class EscapedLikeExpression < Expression
      include AliasMethods
      include BooleanMethods
      include CastMethods
      include OrderMethods

      # Initialize the expression. Arguments:
      # expr :: Right hand site of LIKE/ILIKE operator, what you are matching against the pattern
      # case_insensitive :: Whether the match is case sensitive
      # placeholder_pattern :: The pattern to match against, with +?+ for the placeholders
      # placeholder_values :: The string values for each +?+ in the placeholder pattern.  Should be an
      #                       array of strings, though it can be a single string if there is only
      #                       a single placeholder.
      def initialize(expr, case_sensitive, placeholder_pattern, placeholder_values)
        @expr = expr
        @method = case_sensitive ? :like : :ilike
        @pattern = placeholder_pattern
        unless placeholder_values.is_a?(Array)
          placeholder_values = [placeholder_values].freeze
        end
        @values = placeholder_values
        freeze
      end

      # Interpolate the pattern values into the placeholder pattern to get the final pattern,
      # now that we have access to the dataset.  Use the expression and final pattern and
      # add an appropriate LIKE/ILIKE expression to the SQL being built.
      def to_s_append(ds, sql)
        i = -1
        match_len = @values.length - 1
        like_pattern = String.new
        pattern = @pattern
        while true
          previous, q, pattern = pattern.partition('?')
          like_pattern << previous

          unless q.empty?
            if i == match_len
              raise Error, "Mismatched number of placeholders (#{i+1}) and placeholder arguments (#{@values.length}) for escaped like expression: #{@pattern.inspect}"
            end
            like_pattern << ds.escape_like(@values.at(i+=1))
          end

          if pattern.empty?
            unless i == match_len
              raise Error, "Mismatched number of placeholders (#{i+1}) and placeholder arguments (#{@values.length}) for escaped like expression: #{@pattern.inspect}"
            end
            break
          end
        end
        ds.literal_append(sql, Sequel.send(@method, @expr, like_pattern))
      end
    end

    module StringMethods
      # Create a +EscapedLikeExpression+ case insensitive pattern match of the receiver
      # with the patterns, interpolated escaped values for each +?+ placeholder in the
      # pattern. 
      #
      #   Sequel[:a].escaped_ilike('?%', 'A') # "a" ILIKE 'A%' ESCAPE '\'
      #   Sequel[:a].escaped_ilike('?%', '%A') # "a" ILIKE '\%A%' ESCAPE '\'
      def escaped_ilike(placeholder_pattern, placeholder_values)
        EscapedLikeExpression.new(self, false, placeholder_pattern, placeholder_values)
      end

      # Create a +EscapedLikeExpression+ case sensitive pattern match of the receiver
      # with the patterns, interpolated escaped values for each +?+ placeholder in the
      # pattern. 
      #
      #   Sequel[:a].escaped_like('?%', 'A') # "a" LIKE 'A%' ESCAPE '\'
      #   Sequel[:a].escaped_like('?%', '%A') # "a" LIKE '\%A%' ESCAPE '\'
      def escaped_like(placeholder_pattern, placeholder_values)
        EscapedLikeExpression.new(self, true, placeholder_pattern, placeholder_values)
      end
    end
  end
end
