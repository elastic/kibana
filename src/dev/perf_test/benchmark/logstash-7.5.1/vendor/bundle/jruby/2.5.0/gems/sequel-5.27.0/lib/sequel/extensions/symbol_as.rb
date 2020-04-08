# frozen-string-literal: true
#
# The symbol_as extension adds Symbol#as, for creating
# Sequel::SQL::AliasedExpression objects. It's
# designed as a shortcut so that instead of:
#
#   Sequel[:column].as(:alias)
#
# you can just write:
#
#   :column.as(:alias)
#
# To load the extension:
#
#   Sequel.extension :symbol_as
#
# If you are using Ruby 2+, and you would like to use refinements, there
# is a refinement version of this in the symbol_as_refinement extension.

# 
class Symbol
  include Sequel::SQL::AliasMethods
end
