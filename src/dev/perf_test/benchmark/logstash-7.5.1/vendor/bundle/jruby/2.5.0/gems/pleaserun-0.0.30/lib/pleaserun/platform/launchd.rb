require "pleaserun/platform/base"
require "pleaserun/namespace"

# The platform implementation for Apple's launchd.
#
# OS X users, this is for you!
class PleaseRun::Platform::Launchd < PleaseRun::Platform::Base
  # Returns the file path to write this launchd config
  def daemons_path
    # Quoting launchctl(1):      
    #    "/Library/LaunchDaemons         System wide daemons provided by the administrator."
    return safe_filename("/Library/LaunchDaemons/{{ name }}.plist")
  end # def daemons_path

  def files
    return Enumerator::Generator.new do |out|
      out.yield(daemons_path, render_template("program.plist"))
    end
  end # def files

  def install_actions
    return ["launchctl load #{daemons_path}"]
  end # def install_actions

  def xml_args
    return if args.nil?
    return args.collect { |a| "<string>#{a}</string>" }.join("\n        ")
  end # def xml_args
end
