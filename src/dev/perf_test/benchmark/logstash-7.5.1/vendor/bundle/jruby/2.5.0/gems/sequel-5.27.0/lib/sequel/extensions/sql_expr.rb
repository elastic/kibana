# frozen-string-literal: true
#
# The sql_expr extension adds the sql_expr method to every object, which
# returns an wrapped object that works nicely with Sequel's DSL by calling
# Sequel.expr:
#
#   1.sql_expr < :a     # 1 < a
#   false.sql_expr & :a # FALSE AND a
#   true.sql_expr | :a  # TRUE OR a
#   ~nil.sql_expr       # NOT NULL
#   "a".sql_expr + "b"  # 'a' || 'b'
#
# To load the extension:
#
#   Sequel.extension :sql_expr

#
class Object
  # Return the object wrapper in an appropriate Sequel expression object.
  def sql_expr
    Sequel[self]
  end
end
