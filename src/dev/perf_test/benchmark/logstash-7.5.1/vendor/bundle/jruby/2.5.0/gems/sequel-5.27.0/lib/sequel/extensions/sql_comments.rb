# frozen-string-literal: true
#
# The sql_comments extension adds Dataset#comment to the datasets,
# allowing you to set SQL comments in the resulting query.  These
# comments are appended to the end of the SQL query:
#
#   ds = DB[:table].comment("Some Comment").all
#   # SELECT * FROM table -- Some Comment
#   #
#
# As you can see, this uses single line SQL comments (--) suffixed
# by a newline.  This plugin transforms all consecutive whitespace
# in the comment to a single string:
#
#   ds = DB[:table].comment("Some\r\nComment     Here").all
#   # SELECT * FROM table -- Some Comment Here
#   #
#
# The reason for the prefixing and suffixing by newlines is to
# work correctly when used in subqueries:
#
#   ds = DB[:table].comment("Some\r\nComment     Here")
#   ds.where(id: ds).all
#   # SELECT * FROM table WHERE (id IN (SELECT * FROM table -- Some Comment Here
#   # )) -- Some Comment Here
#   #
#
# In addition to working on SELECT queries, it also works when
# inserting, updating, and deleting.
#
# Due to the use of single line SQL comments and converting all
# whitespace to spaces, this should correctly handle even
# malicious input.  However, it would be unwise to rely on that,
# you should ensure that the argument given
# to Dataset#comment is not derived from user input.
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:sql_comments)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:sql_comments)
#
# Note that Microsoft Access does not support inline comments,
# and attempting to use comments on it will result in SQL syntax
# errors.
#
# Related module: Sequel::SQLComments

#
module Sequel
  module SQLComments
    # Return a modified copy of the dataset that will use the given comment.
    # To uncomment a commented dataset, pass nil as the argument.
    def comment(comment)
      clone(:comment=>(format_sql_comment(comment) if comment))
    end

    %w'select insert update delete'.each do |type|
      define_method(:"#{type}_sql") do |*a|
        sql = super(*a)
        if comment = @opts[:comment]
          # This assumes that the comment stored in the dataset has
          # already been formatted. If not, this could result in SQL
          # injection.
          #
          # Additionally, due to the use of an SQL comment, if any
          # SQL is appened to the query after the comment is added,
          # it will become part of the comment unless it is preceded
          # by a newline.
          if sql.frozen?
            sql += comment
            sql.freeze
          else
            sql << comment
          end
        end
        sql
      end
    end

    private

    # Format the comment.  For maximum compatibility, this uses a
    # single line SQL comment, and converts all consecutive whitespace
    # in the comment to a single space.
    def format_sql_comment(comment)
      " -- #{comment.to_s.gsub(/\s+/, ' ')}\n"
    end
  end

  Dataset.register_extension(:sql_comments, SQLComments)
end
