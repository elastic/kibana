require 'mustache/enumerable'
require 'mustache/template'
require 'mustache/context'
require 'mustache/settings'

# Mustache is the base class from which your Mustache subclasses
# should inherit (though it can be used on its own).
#
# The typical Mustache workflow is as follows:
#
# * Create a Mustache subclass: class Stats < Mustache
# * Create a template: stats.mustache
# * Instantiate an instance: view = Stats.new
# * Render that instance: view.render
#
# You can skip the instantiation by calling `Stats.render` directly.
#
# While Mustache will do its best to load and render a template for
# you, this process is completely customizable using a few options.
#
# All settings can be overriden at the class level.
#
# For example, going with the above example, we can use
# `Stats.template_path = "/usr/local/templates"` to specify the path
# Mustache uses to find templates.
#
# Here are the available options:
#
# * template_path
#
# The `template_path` setting determines the path Mustache uses when
# looking for a template. By default it is "."
# Setting it to /usr/local/templates, for example, means (given all
# other settings are default) a Mustache subclass `Stats` will try to
# load /usr/local/templates/stats.mustache
#
# * template_extension
#
# The `template_extension` is the extension Mustache uses when looking
# for template files. By default it is "mustache"
#
# * template_file
#
# You can tell Mustache exactly which template to use with this
# setting. It can be a relative or absolute path.
#
# * template
#
# Sometimes you want Mustache to render a string, not a file. In those
# cases you may set the `template` setting. For example:
#
#   >> Mustache.render("Hello {{planet}}", :planet => "World!")
#   => "Hello World!"
#
# The `template` setting is also available on instances.
#
#   view = Mustache.new
#   view.template = "Hi, {{person}}!"
#   view[:person] = 'Mom'
#   view.render # => Hi, mom!
#
# * view_namespace
#
# To make life easy on those developing Mustache plugins for web frameworks or
# other libraries, Mustache will attempt to load view classes (i.e. Mustache
# subclasses) using the `view_class` class method. The `view_namespace` tells
# Mustache under which constant view classes live. By default it is `Object`.
#
# * view_path
#
# Similar to `template_path`, the `view_path` option tells Mustache where to look
# for files containing view classes when using the `view_class` method.
#
class Mustache

  #
  # Public API
  #

  # Instantiates an instance of this class and calls `render` with
  # the passed args.
  #
  # Returns a rendered String version of a template
  def self.render(*args)
    new.render(*args)
  end

  class << self
    alias_method :to_html, :render
    alias_method :to_text, :render
  end

  # Parses our fancy pants template file and returns normal file with
  # all special {{tags}} and {{#sections}}replaced{{/sections}}.
  #
  # data - A String template or a Hash context. If a Hash is given,
  #        we'll try to figure out the template from the class.
  #  ctx - A Hash context if `data` is a String template.
  #
  # Examples
  #
  #   @view.render("Hi {{thing}}!", :thing => :world)
  #
  #   View.template = "Hi {{thing}}!"
  #   @view = View.new
  #   @view.render(:thing => :world)
  #
  # Returns a rendered String version of a template
  def render(data = template, ctx = {})
    tpl = case data
    when Hash
      ctx = data
      templateify(template)
    when Symbol
      self.template_name = data
      templateify(template)
    else
      templateify(data)
    end

    return tpl.render(context) if ctx == {}

    begin
      context.push(ctx)
      tpl.render(context)
    ensure
      context.pop
    end
  end

  alias_method :to_html, :render
  alias_method :to_text, :render

  # Context accessors.
  #
  # view = Mustache.new
  # view[:name] = "Jon"
  # view.template = "Hi, {{name}}!"
  # view.render # => "Hi, Jon!"
  def [](key)
    context[key.to_sym]
  end

  def []=(key, value)
    context[key.to_sym] = value
  end

  # A helper method which gives access to the context at a given time.
  # Kind of a hack for now, but useful when you're in an iterating section
  # and want access to the hash currently being iterated over.
  def context
    @context ||= Context.new(self)
  end

  # Given a file name and an optional context, attempts to load and
  # render the file as a template.
  def self.render_file(name, context = {})
    render(partial(name), context)
  end

  # Given a file name and an optional context, attempts to load and
  # render the file as a template.
  def render_file(name, context = {})
    self.class.render_file(name, context)
  end

  # Given a name, attempts to read a file and return the contents as a
  # string. The file is not rendered, so it might contain
  # {{mustaches}}.
  #
  # Call `render` if you need to process it.
  def self.partial(name)
    File.read("#{template_path}/#{name}.#{template_extension}")
  end

  # Override this in your subclass if you want to do fun things like
  # reading templates from a database. It will be rendered by the
  # context, so all you need to do is return a string.
  def partial(name)
    self.class.partial(name)
  end

  # Override this to provide custom escaping.
  #
  # class PersonView < Mustache
  #   def escapeHTML(str)
  #     my_html_escape_method(str)
  #   end
  # end
  #
  # Returns a String
  def escapeHTML(str)
    CGI.escapeHTML(str)
  end


  #
  # Private API
  #

  # When given a symbol or string representing a class, will try to produce an
  # appropriate view class.
  # e.g.
  #   Mustache.view_namespace = Hurl::Views
  #   Mustache.view_class(:Partial) # => Hurl::Views::Partial
  def self.view_class(name)
    name = classify(name.to_s)

    # Emptiness begets emptiness.
    return Mustache if name.to_s == ''

    file_name = underscore(name)
    name = "#{view_namespace}::#{name}"

    if const = const_get!(name)
      const
    elsif File.exists?(file = "#{view_path}/#{file_name}.rb")
      require "#{file}".chomp('.rb')
      const_get!(name) || Mustache
    else
      Mustache
    end
  end

  # Supercharged version of Module#const_get.
  #
  # Always searches under Object and can find constants by their full name,
  #   e.g. Mustache::Views::Index
  #
  # name - The full constant name to find.
  #
  # Returns the constant if found
  # Returns nil if nothing is found
  def self.const_get!(name)
    name.split('::').reduce(Object) do |klass, cname|
      klass.const_get(cname)
    end
  rescue NameError
    nil
  end

  # Has this template already been compiled? Compilation is somewhat
  # expensive so it may be useful to check this before attempting it.
  def self.compiled?
    @template.is_a? Template
  end

  # Has this instance or its class already compiled a template?
  def compiled?
    (@template && @template.is_a?(Template)) || self.class.compiled?
  end

  # template_partial => TemplatePartial
  # template/partial => Template::Partial
  def self.classify(underscored)
    underscored.split('/').map do |namespace|
      namespace.split(/[-_]/).map do |part|
        part[0] = part[0].chr.upcase; part
      end.join
    end.join('::')
  end

  #   TemplatePartial => template_partial
  # Template::Partial => template/partial
  # Takes a string but defaults to using the current class' name.
  def self.underscore(classified = name)
    classified = name if classified.to_s.empty?
    classified = superclass.name if classified.to_s.empty?

    string = classified.dup.split("#{view_namespace}::").last

    string.split('::').map do |part|
      part[0] = part[0].chr.downcase
      part.gsub(/[A-Z]/) { |s| "_#{s.downcase}"}
    end.join('/')
  end

  # Turns a string into a Mustache::Template. If passed a Template,
  # returns it.
  def self.templateify(obj)
    obj.is_a?(Template) ? obj : Template.new(obj.to_s)
  end

  def templateify(obj)
    self.class.templateify(obj)
  end

  # Return the value of the configuration setting on the superclass, or return
  # the default.
  #
  # attr_name - Symbol name of the attribute.  It should match the instance variable.
  # default   - Default value to use if the superclass does not respond.
  #
  # Returns the inherited or default configuration setting.
  def self.inheritable_config_for(attr_name, default)
    superclass.respond_to?(attr_name) ? superclass.send(attr_name) : default
  end
end
