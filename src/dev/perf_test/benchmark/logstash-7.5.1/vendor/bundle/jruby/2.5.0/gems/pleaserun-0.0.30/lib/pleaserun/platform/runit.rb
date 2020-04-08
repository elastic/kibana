require 'pleaserun/namespace'
require "pleaserun/platform/base"

# The platform implementation for runit
#
# Learn what runit is here: http://smarden.org/runit/
class PleaseRun::Platform::Runit < PleaseRun::Platform::Base
  attribute :service_path, "The path runit service directory",
            :default => "/service" do |path|
    validate do
      insist { path }.is_a?(String)
    end
  end

  def files
    return Enumerator::Generator.new do |enum|
      enum.yield(safe_filename("{{ service_path }}/{{ name }}/run"), render_template('run'))
      enum.yield(safe_filename("{{ service_path }}/{{ name}}/log/run"), render_template('log'))
    end
  end
end
