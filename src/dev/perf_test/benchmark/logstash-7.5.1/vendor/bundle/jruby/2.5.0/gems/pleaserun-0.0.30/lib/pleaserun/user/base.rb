require "pleaserun/namespace"
require "pleaserun/configurable"
require "pleaserun/mustache_methods"

class PleaseRun::User::Base
  include PleaseRun::Configurable
  include PleaseRun::MustacheMethods

  InvalidTemplate = Class.new(StandardError)

  STRING = proc do
    validate do |v|
      insist { v }.is_a?(String)
    end
  end

  STRING_OR_NIL = proc do
    validate do |v|
      begin
        insist { v }.is_a?(String)
      rescue Insist::Failure
        begin
          insist { v }.nil?
        rescue Insist::Failure
          raise Insist::Failure, "Expected #{v} to be a String or nil value."
        end
      end
    end
  end

  attribute :name, "The user name", &STRING
  attribute :platform, "The platform name", &STRING
  attribute :version, "The platform version", &STRING_OR_NIL

  def render_installer
    render_template("installer.sh")
  end

  def render_remover
    render_template("remover.sh")
  end

  # Get the template path for this platform.
  def template_path
    return File.expand_path(File.join(File.dirname(__FILE__), "../../../templates/user/", platform))
  end # def template_path

  def render_template(name)
    possibilities = [ 
      File.join(template_path, "default", name),
      File.join(template_path, name)
    ]
    possibilities.unshift(File.join(template_path, version, name)) if version

    possibilities.each do |path|
      next unless File.readable?(path) && File.file?(path)
      return render(File.read(path))
    end

    raise InvalidTemplate, "Could not find template file for '#{name}'. Tried all of these: #{possibilities.inspect}"
  end # def render_template

  # Render a text input through Mustache based on this object.
  def render(text)
    return Mustache.render(text, self)
  end # def render
end # class PleaseRun::User
