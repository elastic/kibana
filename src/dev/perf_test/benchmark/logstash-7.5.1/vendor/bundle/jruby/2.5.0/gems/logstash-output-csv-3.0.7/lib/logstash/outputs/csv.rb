require "csv"
require "logstash/namespace"
require "logstash/outputs/file"
require "logstash/json"

# CSV output.
#
# Write events to disk in CSV or other delimited format
# Based on the file output, many config values are shared
# Uses the Ruby csv library internally
class LogStash::Outputs::CSV < LogStash::Outputs::File

  config_name "csv"

  # The field names from the event that should be written to the CSV file.
  # Fields are written to the CSV in the same order as the array.
  # If a field does not exist on the event, an empty string will be written.
  # Supports field reference syntax eg: `fields => ["field1", "[nested][field]"]`.
  config :fields, :validate => :array, :required => true

  # Options for CSV output. This is passed directly to the Ruby stdlib to_csv function.
  # Full documentation is available on the http://ruby-doc.org/stdlib-2.0.0/libdoc/csv/rdoc/index.html[Ruby CSV documentation page].
  # A typical use case would be to use alternative column or row seperators eg: `csv_options => {"col_sep" => "\t" "row_sep" => "\r\n"}` gives tab seperated data with windows line endings
  config :csv_options, :validate => :hash, :required => false, :default => Hash.new
  # Option to not escape/munge string values. Please note turning off this option
  # may not make the values safe in your spreadsheet application
  config :spreadsheet_safe, :validate => :boolean, :default => true

  public
  def register
    super
    @csv_options = Hash[@csv_options.map{|(k, v)|[k.to_sym, v]}]
  end

  public
  def multi_receive_encoded(events_and_encoded)
    encoded_by_path = Hash.new {|h,k| h[k] = []}

    events_and_encoded.each do |event,encoded|
      file_output_path = event_path(event)
      encoded_by_path[file_output_path] << event_to_csv(event)
    end

    @io_mutex.synchronize do
      encoded_by_path.each do |path,chunks|
        fd = open(path)
        chunks.each {|chunk| fd.write(chunk) }
        fd.flush
      end

      close_stale_files
    end
  end

  private

  def event_to_csv(event)
    csv_values = @fields.map {|name| get_value(name, event)}
    csv_values.to_csv(@csv_options)
  end

  def get_value(name, event)
    val = event.get(name)
    val.is_a?(Hash) ? LogStash::Json.dump(val) : escape_csv(val)
  end

  private
  def escape_csv(val)
    (spreadsheet_safe && val.is_a?(String) && val.start_with?("=")) ? "'#{val}" : val
  end
end # class LogStash::Outputs::CSV
