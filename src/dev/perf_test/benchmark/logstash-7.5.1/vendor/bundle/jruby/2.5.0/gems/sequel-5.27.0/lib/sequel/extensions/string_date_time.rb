# frozen-string-literal: true
#
# The string_date_time extension provides String instance methods
# for converting the strings to a date (e.g. String#to_date), allowing
# for backwards compatibility with legacy Sequel code.
#
# To load the extension:
#
#   Sequel.extension :string_date_time

class String
  # Converts a string into a Date object.
  def to_date
    begin
      Date.parse(self, Sequel.convert_two_digit_years)
    rescue => e
      raise Sequel.convert_exception_class(e, Sequel::InvalidValue)
    end
  end

  # Converts a string into a DateTime object.
  def to_datetime
    begin
      DateTime.parse(self, Sequel.convert_two_digit_years)
    rescue => e
      raise Sequel.convert_exception_class(e, Sequel::InvalidValue)
    end
  end

  # Converts a string into a Time or DateTime object, depending on the
  # value of Sequel.datetime_class
  def to_sequel_time
    begin
      if Sequel.datetime_class == DateTime
        DateTime.parse(self, Sequel.convert_two_digit_years)
      else
        Sequel.datetime_class.parse(self)
      end
    rescue => e
      raise Sequel.convert_exception_class(e, Sequel::InvalidValue)
    end
  end

  # Converts a string into a Time object.
  def to_time
    begin
      Time.parse(self)
    rescue => e
      raise Sequel.convert_exception_class(e, Sequel::InvalidValue)
    end
  end
end
