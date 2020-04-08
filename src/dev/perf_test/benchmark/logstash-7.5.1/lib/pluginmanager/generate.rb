# encoding: utf-8
require "pluginmanager/command"
require "pluginmanager/templates/render_context"
require "erb"
require "ostruct"
require "fileutils"
require "pathname"

class LogStash::PluginManager::Generate < LogStash::PluginManager::Command

  TYPES = [ "input", "filter", "output", "codec" ]

  option "--type", "TYPE", "Type of the plugin {input, filter, codec, output}s", :required => true
  option "--name", "PLUGIN", "Name of the new plugin", :required => true
  option "--path", "PATH", "Location where the plugin skeleton will be created", :default => Dir.pwd

  def execute
    validate_params
    source = File.join(File.dirname(__FILE__), "templates", "#{type}-plugin")
    @target_path = File.join(path, full_plugin_name)
    FileUtils.mkdir(@target_path)
    puts " Creating #{@target_path}"

    begin
      create_scaffold(source, @target_path)
    rescue Errno::EACCES => exception
      report_exception("Permission denied when executing the plugin manager", exception)
    rescue => exception
      report_exception("Plugin creation Aborted", exception)
    end
  end

  private

  def validate_params
    raise(ArgumentError, "should be one of: input, filter, codec or output") unless TYPES.include?(type)
  end

  def create_scaffold(source, target)
    transform_r(source, target)
  end

  def transform_r(source, target)
    Dir.entries(source).each do |entry|
      next if [ ".", ".." ].include?(entry)
      source_entry = File.join(source, entry)
      target_entry = File.join(target, entry)

      if File.directory?(source_entry)
        FileUtils.mkdir(target_entry) unless File.exists?(target_entry)
        transform_r(source_entry, target_entry)
      else
        # copy the new file, in case of being an .erb file should render first
        if source_entry.end_with?("erb")
          target_entry = target_entry.gsub(/.erb$/,"").gsub("example", name)
          File.open(target_entry, "w") { |f| f.write(render(source_entry)) }
        else
          FileUtils.cp(source_entry, target_entry)
        end
        puts "\t create #{File.join(full_plugin_name, Pathname.new(target_entry).relative_path_from(Pathname.new(@target_path)))}"
      end
    end
  end

  def render(source)
    template = File.read(source)
    renderer = ERB.new(template)
    context  = LogStash::PluginManager::RenderContext.new(options)
    renderer.result(context.get_binding)
  end

  def options
    git_data = get_git_info
    @options ||= {
      :plugin_name => name,
      :author => git_data.author,
      :email  => git_data.email,
      :min_version => "2.0",
    }
  end

  def get_git_info
    git = OpenStruct.new
    git.author = %x{ git config --get user.name  }.strip rescue "your_username"
    git.email  = %x{ git config --get user.email }.strip rescue "your_username@example.com"
    git
  end

  def full_plugin_name
    @full_plugin_name ||= "logstash-#{type}-#{name.downcase}"
  end
end
