# frozen-string-literal: true
#
# This switches the default parsing of strings into Time values
# from using Time.parse to using DateTime.parse.to_time.  This
# fixes issues when the times being parsed have no timezone
# information, the implicit timezone for the Database instance
# is set to +:utc+, and the timestamps being used include values
# not valid in the local timezone, such as during a daylight
# savings time switch.  
#
# To load the extension:
#
#   Sequel.extension :datetime_parse_to_time

#
module Sequel::DateTimeParseToTime
  private

  # Use DateTime.parse.to_time to do the conversion if the input a string and is assumed to
  # be in UTC and there is no offset information in the string.
  def convert_input_timestamp(v, input_timezone)
    if v.is_a?(String) && datetime_class == Time && input_timezone == :utc && !Date._parse(v).has_key?(:offset)
      t = DateTime.parse(v).to_time
      case application_timezone
      when nil, :local
        t = t.localtime
      end
      t
    else
      super
    end
  rescue => e
    raise convert_exception_class(e, Sequel::InvalidValue)
  end
end

Sequel.extend(Sequel::DateTimeParseToTime)
