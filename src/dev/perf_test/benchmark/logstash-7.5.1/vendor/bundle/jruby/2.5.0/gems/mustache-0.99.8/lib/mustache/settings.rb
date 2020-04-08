# Settings which can be configured for all view classes, a single
# view class, or a single Mustache instance.
class Mustache

  #
  # Template Path
  #

  # The template path informs your Mustache view where to look for its
  # corresponding template. By default it's the current directory (".")
  #
  # A class named Stat with a template_path of "app/templates" will look
  # for "app/templates/stat.mustache"

  def self.template_path
    @template_path ||= inheritable_config_for :template_path, '.'
  end

  def self.template_path=(path)
    @template_path = File.expand_path(path)
    @template = nil
  end

  def template_path
    @template_path ||= self.class.template_path
  end

  def template_path=(path)
    @template_path = File.expand_path(path)
    @template = nil
  end

  # Alias for `template_path`
  def self.path
    template_path
  end
  alias_method :path, :template_path

  # Alias for `template_path`
  def self.path=(path)
    self.template_path = path
  end
  alias_method :path=, :template_path=


  #
  # Template Extension
  #

  # A Mustache template's default extension is 'mustache', but this can be changed.

  def self.template_extension
    @template_extension ||= inheritable_config_for :template_extension, 'mustache'
  end

  def self.template_extension=(template_extension)
    @template_extension = template_extension
    @template = nil
  end

  def template_extension
    @template_extension ||= self.class.template_extension
  end

  def template_extension=(template_extension)
    @template_extension = template_extension
    @template = nil
  end


  #
  # Template Name
  #

  # The template name is the Mustache template file without any
  # extension or other information. Defaults to `class_name`.
  #
  # You may want to change this if your class is named Stat but you want
  # to re-use another template.
  #
  #   class Stat
  #     self.template_name = "graphs" # use graphs.mustache
  #   end

  def self.template_name
    @template_name || underscore
  end

  def self.template_name=(template_name)
    @template_name = template_name
    @template = nil
  end

  def template_name
    @template_name ||= self.class.template_name
  end

  def template_name=(template_name)
    @template_name = template_name
    @template = nil
  end


  #
  # Template File
  #

  # The template file is the absolute path of the file Mustache will
  # use as its template. By default it's ./class_name.mustache

  def self.template_file
    @template_file || "#{path}/#{template_name}.#{template_extension}"
  end

  def self.template_file=(template_file)
    @template_file = template_file
    @template = nil
  end

  # The template file is the absolute path of the file Mustache will
  # use as its template. By default it's ./class_name.mustache
  def template_file
    @template_file || "#{path}/#{template_name}.#{template_extension}"
  end

  def template_file=(template_file)
    @template_file = template_file
    @template = nil
  end


  #
  # Template
  #

  # The template is the actual string Mustache uses as its template.
  # There is a bit of magic here: what we get back is actually a
  # Mustache::Template object, but you can still safely use `template=`
  #  with a string.

  def self.template
    @template ||= templateify(File.read(template_file))
  end

  def self.template=(template)
    @template = templateify(template)
  end

  # The template can be set at the instance level.
  def template
    return @template if @template

    # If they sent any instance-level options use that instead of the class's.
    if @template_path || @template_extension || @template_name || @template_file
      @template = templateify(File.read(template_file))
    else
      @template = self.class.template
    end
  end

  def template=(template)
    @template = templateify(template)
  end


  #
  # Raise on context miss
  #

  # Should an exception be raised when we cannot find a corresponding method
  # or key in the current context? By default this is false to emulate ctemplate's
  # behavior, but it may be useful to enable when debugging or developing.
  #
  # If set to true and there is a context miss, `Mustache::ContextMiss` will
  # be raised.

  def self.raise_on_context_miss?
    @raise_on_context_miss
  end

  def self.raise_on_context_miss=(boolean)
    @raise_on_context_miss = boolean
  end

  # Instance level version of `Mustache.raise_on_context_miss?`
  def raise_on_context_miss?
    self.class.raise_on_context_miss? || @raise_on_context_miss
  end

  def raise_on_context_miss=(boolean)
    @raise_on_context_miss = boolean
  end


  #
  # View Namespace
  #

  # The constant under which Mustache will look for views when autoloading.
  # By default the view namespace is `Object`, but it might be nice to set
  # it to something like `Hurl::Views` if your app's main namespace is `Hurl`.

  def self.view_namespace
    @view_namespace ||= inheritable_config_for(:view_namespace, Object)
  end

  def self.view_namespace=(namespace)
    @view_namespace = namespace
  end


  #
  # View Path
  #

  # Mustache searches the view path for .rb files to require when asked to find a
  # view class. Defaults to "."

  def self.view_path
    @view_path ||= inheritable_config_for(:view_path, '.')
  end

  def self.view_path=(path)
    @view_path = path
  end
end
