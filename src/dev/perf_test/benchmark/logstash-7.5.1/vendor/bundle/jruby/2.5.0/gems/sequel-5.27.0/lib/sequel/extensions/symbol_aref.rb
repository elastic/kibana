# frozen-string-literal: true
#
# The symbol_aref extension makes Symbol#[] support Symbol,
# Sequel::SQL::Indentifier, and Sequel::SQL::QualifiedIdentifier instances,
# returning appropriate Sequel::SQL::QualifiedIdentifier instances.  It's
# designed as a shortcut so that instead of:
#
#   Sequel[:table][:column] # table.column
#
# you can just write:
#
#   :table[:column] # table.column
#
# To load the extension:
#
#   Sequel.extension :symbol_aref
#
# If you are using Ruby 2+, and you would like to use refinements, there
# is a refinement version of this in the symbol_aref_refinement extension.
#
# Related module: Sequel::SymbolAref

if RUBY_VERSION >= '2.0'
  module Sequel::SymbolAref
    def [](v)
      case v
      when Symbol, Sequel::SQL::Identifier, Sequel::SQL::QualifiedIdentifier
        Sequel::SQL::QualifiedIdentifier.new(self, v)
      else
        super
      end
    end
  end

  class Symbol
    prepend Sequel::SymbolAref
  end
else
  class Symbol
    if method_defined?(:[])
      alias_method :aref_before_sequel, :[] 
    end

    def [](v)
      case v
      when Symbol, Sequel::SQL::Identifier, Sequel::SQL::QualifiedIdentifier
        Sequel::SQL::QualifiedIdentifier.new(self, v)
      else
        aref_before_sequel(v)
      end
    end
  end
end
