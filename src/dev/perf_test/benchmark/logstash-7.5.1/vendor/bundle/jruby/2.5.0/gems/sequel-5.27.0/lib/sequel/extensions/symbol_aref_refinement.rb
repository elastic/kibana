# frozen-string-literal: true
#
# The symbol_aref_refinement extension adds a refinement that makes
# Symbol#[] support Symbol, #Sequel::SQL::Indentifier, and
# Sequel::SQL::QualifiedIdentifier instances, returning appropriate
# Sequel::SQL::QualifiedIdentifier instances.  It's designed as a
# shortcut so that instead of:
#
#   Sequel[:table][:column] # table.column
#
# you can just write:
#   
#   :table[:column] # table.column
#
# To load the extension:
#
#   Sequel.extension :symbol_aref_refinement
#
# To enable the refinement for the current file:
#
#   using Sequel::SymbolAref
#
# If you would like this extension to be enabled globally instead
# of as a refinement, use the symbol_aref extension.
#
# Related module: Sequel::SymbolAref

raise(Sequel::Error, "Refinements require ruby 2.0.0 or greater") unless RUBY_VERSION >= '2.0.0'

module Sequel::SymbolAref
  refine Symbol do
    def [](v)
      case v
      when Symbol, Sequel::SQL::Identifier, Sequel::SQL::QualifiedIdentifier
        Sequel::SQL::QualifiedIdentifier.new(self, v)
      else
        super
      end
    end
  end
end
