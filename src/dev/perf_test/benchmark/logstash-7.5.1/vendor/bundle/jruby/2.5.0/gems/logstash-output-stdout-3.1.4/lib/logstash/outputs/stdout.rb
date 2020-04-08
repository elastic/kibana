# encoding: utf-8
require "logstash/outputs/base"
require "logstash/namespace"

# A simple output which prints to the STDOUT of the shell running
# Logstash. This output can be quite convenient when debugging
# plugin configurations, by allowing instant access to the event
# data after it has passed through the inputs and filters.
#
# For example, the following output configuration, in conjunction with the
# Logstash `-e` command-line flag, will allow you to see the results
# of your event pipeline for quick iteration.
# [source,ruby]
#     output {
#       stdout {}
#     }
#
# Useful codecs include:
#
# `plain`: outputs event data with no delimiting between events
#
# [source,ruby]
#     output {
#       stdout { codec => plain }
#     }
#
# `json`: outputs event data in structured JSON format
# [source,ruby]
#     output {
#       stdout { codec => json }
#     }
#
class LogStash::Outputs::Stdout < LogStash::Outputs::Base
  config_name "stdout"
  concurrency :single

  default :codec, "rubydebug"

  def register; end # must be overriden

  def multi_receive_encoded(encoded)
    encoded.each do |event,data|
      $stdout.write(data)
    end
  end

end # class LogStash::Outputs::Stdout
