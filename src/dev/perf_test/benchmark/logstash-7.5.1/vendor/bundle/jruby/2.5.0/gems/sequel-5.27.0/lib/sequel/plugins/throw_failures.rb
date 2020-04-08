# frozen-string-literal: true

module Sequel
  module Plugins
    # The throw_failures plugin throws HookFailed and ValidationFailed exceptions instead
    # of raising them.  If there is no matching catch block, the UncaughtThrowError will be rescued
    # and the HookFailed or ValidationFailed exception will be raised normally.
    #
    # If you are setting up the catch blocks to handle these failures, in the failure case this
    # plugin is about 10-15% faster on CRuby and 10x faster on JRuby.  If you are not
    # setting up the catch blocks, in the failure case this plugin is about 30% slower on CRuby
    # and 2x slower on JRuby.  So this plugin should only be used if you are setting up catch
    # blocks manually.
    #
    # This plugin will setup catch blocks automatically for internally rescued HookFailed
    # exceptions when the model is configured to not raise exceptions on failure (by default,
    # the exceptions are internally rescued in that case.
    #
    # To set up the catch blocks, use the class of the exception:
    #
    #   ret = catch(Sequel::ValidationFailed) do
    #     model_instance.save
    #   end
    #   if ret.is_a?(Sequel::ValidationFailed)
    #     # handle failure
    #   else
    #     # handle success
    #   end
    #
    # Usage:
    #
    #   # Make all model subclass instances throw HookFailed and ValidationFailed exceptions
    #   # (called before loading subclasses)
    #   Sequel::Model.plugin :throw_failures
    #
    #   # Make the Album class throw HookFailed and ValidationFailed exceptions
    #   Album.plugin :throw_failures
    module ThrowFailures
      module InstanceMethods
        # Catch any thrown HookFailed exceptions.
        def valid?(opts = OPTS)
          catch_hook_failures{super} || false
        end

        private

        # Catch any HookFailed exceptions thrown inside the block, and return
        # nil if there were any.
        def catch_hook_failures
          called = ret = nil
          caught = catch(HookFailed) do
            ret = yield
            called = true
          end
          ret if called
        end

        # Catch any thrown HookFailed exceptions if not raising on failure.
        def checked_save_failure(opts)
          if raise_on_failure?(opts)
            super
          else
            catch_hook_failures{super}
          end
        end

        if RUBY_VERSION >= '2.2' && (!defined?(JRUBY_VERSION) || JRUBY_VERSION > '9.1')
          # Throw HookFailed with the generated error.  If the throw is not
          # caught, just return the originally generated error.
          def hook_failed_error(msg)
            e = super
            throw HookFailed, e
          rescue UncaughtThrowError
            e
          end

          # Throw ValidationFailed with the generated error.  If the throw is not
          # caught, just return the originally generated error.
          def validation_failed_error
            e = super
            throw ValidationFailed, e
          rescue UncaughtThrowError
            e
          end
        else
          # UncaughtThrowError was added in Ruby 2.2.  Older Ruby versions
          # used ArgumentError with "uncaught throw" at the start of the message

          # :nocov:
          def hook_failed_error(msg)
            e = super
            throw HookFailed, e
          rescue ArgumentError => e2
            raise e2 unless e2.message.start_with?('uncaught throw')
            e
          end

          def validation_failed_error
            e = super
            throw ValidationFailed, e
          rescue ArgumentError => e2
            raise e2 unless e2.message.start_with?('uncaught throw')
            e
          end
          # :nocov:
        end
      end
    end
  end
end
