# frozen_string_literal: true

module Faraday
  # @param new_klass [Class] new Klass to use
  #
  # @return [Class] A modified version of new_klass that warns on
  #   usage about deprecation.
  # @see Faraday::Deprecate
  module DeprecatedClass
    def self.proxy_class(origclass, ver = '1.0')
      proxy = Class.new(origclass) do
        class << self
          extend Faraday::Deprecate

          def ===(other)
            other.is_a?(superclass) || super
          end
        end
      end
      proxy.singleton_class.send(:deprecate, :new, "#{origclass}.new", ver)
      proxy.singleton_class.send(:deprecate, :inherited, origclass.name, ver)
      proxy
    end
  end

  # Deprecation using semver instead of date, based on Gem::Deprecate
  # Provides a single method +deprecate+ to be used to declare when
  # something is going away.
  #
  #     class Legacy
  #       def self.klass_method
  #         # ...
  #       end
  #
  #       def instance_method
  #         # ...
  #       end
  #
  #       extend Faraday::Deprecate
  #       deprecate :instance_method, "X.z", '1.0'
  #
  #       class << self
  #         extend Faraday::Deprecate
  #         deprecate :klass_method, :none, '1.0'
  #       end
  #     end
  module Deprecate
    def self.skip # :nodoc:
      @skip ||= false
    end

    def self.skip=(value) # :nodoc:
      @skip = value
    end

    # Temporarily turn off warnings. Intended for tests only.
    def skip_during
      original = Faraday::Deprecate.skip
      Faraday::Deprecate.skip, = true
      yield
    ensure
      Faraday::Deprecate.skip = original
    end

    # Simple deprecation method that deprecates +name+ by wrapping it up
    # in a dummy method. It warns on each call to the dummy method
    # telling the user of +repl+ (unless +repl+ is :none) and the
    # semver that it is planned to go away.
    # @param name [Symbol] the method symbol to deprecate
    # @param repl [#to_s, :none] the replacement to use, when `:none` it will
    #   alert the user that no replacemtent is present.
    # @param ver [String] the semver the method will be removed.
    def deprecate(name, repl, ver)
      class_eval do
        gem_ver = Gem::Version.new(ver)
        old = "_deprecated_#{name}"
        alias_method old, name
        define_method name do |*args, &block|
          mod = is_a? Module
          target = mod ? "#{self}." : "#{self.class}#"
          target_message = if name == :inherited
                             "Inheriting #{self}"
                           else
                             "#{target}#{name}"
                           end

          msg = [
            "NOTE: #{target_message} is deprecated",
            repl == :none ? ' with no replacement' : "; use #{repl} instead. ",
            "It will be removed in or after version #{gem_ver}",
            "\n#{target}#{name} called from #{Gem.location_of_caller.join(':')}"
          ]
          warn "#{msg.join}." unless Faraday::Deprecate.skip
          send old, *args, &block
        end
      end
    end

    module_function :deprecate, :skip_during
  end
end
