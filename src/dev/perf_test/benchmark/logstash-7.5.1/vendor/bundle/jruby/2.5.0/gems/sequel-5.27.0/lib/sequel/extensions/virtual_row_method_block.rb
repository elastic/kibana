# frozen-string-literal: true
#
# These modifies virtual row blocks so that you can pass a block
# when calling a method to change the behavior.  It only exists
# for backwards compatibility with previous Sequel versions, and
# is not recommended for new applications.
# 
# To load the extension:
#
#   Sequel.extension :virtual_row_method_block

#
module Sequel
  module SQL
    class VirtualRow < BasicObject
      include(Module.new do
        # Handle blocks passed to methods and change the behavior.
        def method_missing(m, *args, &block)
          if block
            if args.empty?
              Function.new(m)
            else
              case args.shift
              when :*
                Function.new(m, *args).*
              when :distinct
                Function.new(m, *args).distinct
              when :over
                opts = args.shift || OPTS
                f = Function.new(m, *::Kernel.Array(opts[:args]))
                f = f.* if opts[:*]
                f.over(opts)
              else
                Kernel.raise(Error, 'unsupported VirtualRow method argument used with block')
              end
            end
          else
            super
          end
        end
      end)
    end
  end
end
