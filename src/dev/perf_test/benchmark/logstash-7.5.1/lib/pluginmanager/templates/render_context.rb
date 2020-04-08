require "erb"

module LogStash::PluginManager
  class RenderContext
    def initialize(options = {})
      options.each do |name, value|
        define_singleton_method(name) { value }
      end
    end

    def get_binding
      binding()
    end

    def classify(klass_name)
      klass_name.split(/-|_/).map { |e| e.capitalize }.join("")
    end

  end
end
