# frozen-string-literal: true
#
# The s extension adds Sequel::S, a module containing a private #S
# method that calls Sequel.expr.  It's designed as a shortcut so
# that instead of:
#
#   Sequel.expr(:column) + 1
#   # or
#   Sequel.expr{column + 1}
#
# you can just write:
#
#   S(:column) + 1
#   # or
#   S{column + 1}
#
# To load the extension:
#
#   Sequel.extension :s
#
# Then you can include the Sequel::S module into whatever classes or
# objects you care about:
#
#   Sequel::Model.send(:include, Sequel::S)   # available in model instance methods
#   Sequel::Model.extend(Sequel::S)           # available in model class methods
#   Sequel::Dataset.send(:include, Sequel::S) # available in dataset methods
#
# or just into Object if you want it available everywhere:
#
#   Object.send(:include, Sequel::S)
#
# If you are using Ruby 2+, and you would like to use refinements, you
# can use Sequel::S as a refinement, in which case the private #S method
# will be available on all objects while the refinement is active.
#
#   using Sequel::S
#
#   S(:column) + 1
#
# Related module: Sequel::S


# 
module Sequel::S
  private

  # Delegate to Sequel.expr
  def S(*a, &block)
    Sequel.expr(*a, &block)
  end

  if RUBY_VERSION >= '2.0.0'
    refine Object do
      include Sequel::S
    end
  end
end
