if defined? Mustache
  require 'benchmark'

  Mustache.class_eval do
    alias_method :real_render, :render

    def render(*args, &block)
      out = ''
      Rack::Bug::MustachePanel.times[self.class.name] = Benchmark.realtime do
        out = real_render(*args, &block)
      end
      out
    end

    alias_method :to_html, :render
    alias_method :to_text, :render
  end

  Mustache::Context.class_eval do
    alias_method :real_get, :[]

    def [](name)
      return real_get(name) if name == :yield || !@mustache.respond_to?(name)
      Rack::Bug::MustachePanel.variables[name] = real_get(name)
    end
  end
end
