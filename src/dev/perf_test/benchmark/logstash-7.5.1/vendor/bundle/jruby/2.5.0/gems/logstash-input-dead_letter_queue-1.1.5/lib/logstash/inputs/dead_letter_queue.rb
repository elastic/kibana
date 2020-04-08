require 'logstash/namespace'
require 'logstash/inputs/base'
require 'logstash-input-dead_letter_queue_jars'

# Logstash input to read events from Logstash's dead letter queue
# 
# [source, sh]
# -----------------------------------------
# input {
#   dead_letter_queue {
#     path => "/var/logstash/data/dead_letter_queue"
#     timestamp => "2017-04-04T23:40:37"
#   }
# }
# -----------------------------------------
# 
class LogStash::Inputs::DeadLetterQueue < LogStash::Inputs::Base
  config_name 'dead_letter_queue'

  default :codec, 'plain'

  # Path to the dead letter queue directory which was created by a Logstash instance.
  # This is the path from where "dead" events are read from and is typically configured 
  # in the original Logstash instance with the setting path.dead_letter_queue.
  config :path, :validate => :path, :required => true
  # ID of the pipeline whose events you want to read from.
  config :pipeline_id, :validate => :string, :default => "main"
  # Path of the sincedb database file (keeps track of the current position of dead letter queue) that 
  # will be written to disk. The default will write sincedb files to `<path.data>/plugins/inputs/dead_letter_queue`
  # NOTE: it must be a file path and not a directory path
  config :sincedb_path, :validate => :string, :required => false
  # Should this input commit offsets as it processes the events. `false` value is typically 
  # used when you want to iterate multiple times over the events in the dead letter queue, but don't want to 
  # save state. This is when you are exploring the events in the dead letter queue. 
  config :commit_offsets, :validate => :boolean, :default => true
  # Timestamp in ISO8601 format from when you want to start processing the events from. 
  # For example, 2017-04-04T23:40:37
  config :start_timestamp, :validate => :string, :required => false

  public
  def register
    if @sincedb_path.nil?
      datapath = File.join(LogStash::SETTINGS.get_value("path.data"), "plugins", "inputs", "dead_letter_queue", @pipeline_id)
      # Ensure that the filepath exists before writing, since it's deeply nested.
      FileUtils::mkdir_p datapath
      @sincedb_path = File.join(datapath, ".sincedb_" + Digest::MD5.hexdigest(@path))
    elsif File.directory?(@sincedb_path)
        raise ArgumentError.new("The \"sincedb_path\" argument must point to a file, received a directory: \"#{@sincedb_path}\"")
    end

    dlq_path = java.nio.file.Paths.get(File.join(@path, @pipeline_id))
    sincedb_path = @sincedb_path ? java.nio.file.Paths.get(@sincedb_path) : nil
    start_timestamp = @start_timestamp ? org.logstash.Timestamp.new(@start_timestamp) : nil
    @inner_plugin = org.logstash.input.DeadLetterQueueInputPlugin.new(dlq_path, @commit_offsets, sincedb_path, start_timestamp)
    @inner_plugin.register
  end # def register

  public
  def run(logstash_queue)
    @inner_plugin.run do |entry|
      event = LogStash::Event.new(entry.event.toMap())
      event.set("[@metadata][dead_letter_queue][plugin_type]", entry.plugin_type)
      event.set("[@metadata][dead_letter_queue][plugin_id]", entry.plugin_id)
      event.set("[@metadata][dead_letter_queue][reason]", entry.reason)
      event.set("[@metadata][dead_letter_queue][entry_time]", entry.entry_time)
      decorate(event)
      logstash_queue << event
    end
  end # def run

  public
  def stop
    @inner_plugin.close
  end
end
