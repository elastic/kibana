$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class MethodMissing < Mustache
  self.template = '[ {{#list}}{{.}} {{/list}}]'

  def method_missing(name, *args, &block)
    return (0..10).to_a if name == :list
    return super
  end

  def respond_to?(method)
    method == :list
  end
end

if $0 == __FILE__
  puts MethodMissing.to_html
end
