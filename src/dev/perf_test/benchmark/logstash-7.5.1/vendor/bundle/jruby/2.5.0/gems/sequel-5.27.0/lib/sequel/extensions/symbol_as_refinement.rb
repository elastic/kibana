# frozen-string-literal: true
#
# The symbol_as_refinement extension adds a refinement that makes
# Symbol#as return Sequel::SQL::AliasedExpression instances.  It's
# designed as a shortcut so that instead of:
#
#   Sequel[:column].as(:alias) # column AS alias
#
# you can just write:
#   
#   :column.as(:alias) # column AS alias
#
# To load the extension:
#
#   Sequel.extension :symbol_as_refinement
#
# To enable the refinement for the current file:
#
#   using Sequel::SymbolAs
#
# If you would like this extension to be enabled globally instead
# of as a refinement, use the symbol_as extension.
#
# Related module: Sequel::SymbolAs

raise(Sequel::Error, "Refinements require ruby 2.0.0 or greater") unless RUBY_VERSION >= '2.0.0'

module Sequel::SymbolAs
  refine Symbol do
    def as(aliaz, columns=nil)
      Sequel::SQL::AliasedExpression.new(self, aliaz, columns)
    end
  end
end

