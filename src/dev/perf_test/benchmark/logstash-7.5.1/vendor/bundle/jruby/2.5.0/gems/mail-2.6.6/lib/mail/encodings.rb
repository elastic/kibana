# encoding: utf-8
# frozen_string_literal: true

module Mail
  # Raised when attempting to decode an unknown encoding type
  class UnknownEncodingType < StandardError #:nodoc:
  end

  module Encodings

    include Mail::Constants
    extend  Mail::Utilities

    @transfer_encodings = {}

    # Register transfer encoding
    #
    # Example
    #
    # Encodings.register "base64", Mail::Encodings::Base64
    def Encodings.register(name, cls)
        @transfer_encodings[get_name(name)] = cls
    end

    # Is the encoding we want defined?
    #
    # Example:
    #
    #  Encodings.defined?(:base64) #=> true
    def Encodings.defined?( str )
      @transfer_encodings.include? get_name(str)
    end

    # Gets a defined encoding type, QuotedPrintable or Base64 for now.
    #
    # Each encoding needs to be defined as a Mail::Encodings::ClassName for
    # this to work, allows us to add other encodings in the future.
    #
    # Example:
    #
    #  Encodings.get_encoding(:base64) #=> Mail::Encodings::Base64
    def Encodings.get_encoding( str )
      @transfer_encodings[get_name(str)]
    end

    def Encodings.get_all
      @transfer_encodings.values
    end

    def Encodings.get_name(enc)
      underscoreize(enc).downcase
    end

    def Encodings.transcode_charset(str, from_charset, to_charset = 'UTF-8')
      if from_charset
        RubyVer.transcode_charset str, from_charset, to_charset
      else
        str
      end
    end

    # Encodes a parameter value using URI Escaping, note the language field 'en' can
    # be set using Mail::Configuration, like so:
    #
    #  Mail.defaults do
    #    param_encode_language 'jp'
    #  end
    #
    # The character set used for encoding will either be the value of $KCODE for
    # Ruby < 1.9 or the encoding on the string passed in.
    #
    # Example:
    #
    #  Mail::Encodings.param_encode("This is fun") #=> "us-ascii'en'This%20is%20fun"
    def Encodings.param_encode(str)
      case
      when str.ascii_only? && str =~ TOKEN_UNSAFE
        %Q{"#{str}"}
      when str.ascii_only?
        str
      else
        RubyVer.param_encode(str)
      end
    end

    # Decodes a parameter value using URI Escaping.
    #
    # Example:
    #
    #  Mail::Encodings.param_decode("This%20is%20fun", 'us-ascii') #=> "This is fun"
    #
    #  str = Mail::Encodings.param_decode("This%20is%20fun", 'iso-8559-1')
    #  str.encoding #=> 'ISO-8859-1'      ## Only on Ruby 1.9
    #  str #=> "This is fun"
    def Encodings.param_decode(str, encoding)
      RubyVer.param_decode(str, encoding)
    end

    # Decodes or encodes a string as needed for either Base64 or QP encoding types in
    # the =?<encoding>?[QB]?<string>?=" format.
    #
    # The output type needs to be :decode to decode the input string or :encode to
    # encode the input string.  The character set used for encoding will either be
    # the value of $KCODE for Ruby < 1.9 or the encoding on the string passed in.
    #
    # On encoding, will only send out Base64 encoded strings.
    def Encodings.decode_encode(str, output_type)
      case
      when output_type == :decode
        Encodings.value_decode(str)
      else
        if str.ascii_only?
          str
        else
          Encodings.b_value_encode(str, find_encoding(str))
        end
      end
    end

    # Decodes a given string as Base64 or Quoted Printable, depending on what
    # type it is.
    #
    # String has to be of the format =?<encoding>?[QB]?<string>?=
    def Encodings.value_decode(str)
      # Optimization: If there's no encoded-words in the string, just return it
      return str unless str =~ ENCODED_VALUE

      lines = collapse_adjacent_encodings(str)

      # Split on white-space boundaries with capture, so we capture the white-space as well
      lines.each do |line|
        line.gsub!(ENCODED_VALUE) do |string|
          case $2
          when *B_VALUES then b_value_decode(string)
          when *Q_VALUES then q_value_decode(string)
          end
        end
      end.join("")
    end

    # Takes an encoded string of the format =?<encoding>?[QB]?<string>?=
    def Encodings.unquote_and_convert_to(str, to_encoding)
      output = value_decode( str ).to_s # output is already converted to UTF-8

      if 'utf8' == to_encoding.to_s.downcase.gsub("-", "")
        output
      elsif to_encoding
        begin
          if RUBY_VERSION >= '1.9'
            output.encode(to_encoding)
          else
            require 'iconv'
            Iconv.iconv(to_encoding, 'UTF-8', output).first
          end
        rescue Iconv::IllegalSequence, Iconv::InvalidEncoding, Errno::EINVAL
          # the 'from' parameter specifies a charset other than what the text
          # actually is...not much we can do in this case but just return the
          # unconverted text.
          #
          # Ditto if either parameter represents an unknown charset, like
          # X-UNKNOWN.
          output
        end
      else
        output
      end
    end

    def Encodings.address_encode(address, charset = 'utf-8')
      if address.is_a?(Array)
        # loop back through for each element
        address.compact.map { |a| Encodings.address_encode(a, charset) }.join(", ")
      else
        # find any word boundary that is not ascii and encode it
        encode_non_usascii(address, charset) if address
      end
    end

    def Encodings.encode_non_usascii(address, charset)
      return address if address.ascii_only? or charset.nil?
      us_ascii = %Q{\x00-\x7f}
      # Encode any non usascii strings embedded inside of quotes
      address = address.gsub(/(".*?[^#{us_ascii}].*?")/) { |s| Encodings.b_value_encode(unquote(s), charset) }
      # Then loop through all remaining items and encode as needed
      tokens = address.split(/\s/)
      map_with_index(tokens) do |word, i|
        if word.ascii_only?
          word
        else
          previous_non_ascii = i>0 && tokens[i-1] && !tokens[i-1].ascii_only?
          if previous_non_ascii #why are we adding an extra space here?
            word = " #{word}"
          end
          Encodings.b_value_encode(word, charset)
        end
      end.join(' ')
    end

    # Encode a string with Base64 Encoding and returns it ready to be inserted
    # as a value for a field, that is, in the =?<charset>?B?<string>?= format
    #
    # Example:
    #
    #  Encodings.b_value_encode('This is あ string', 'UTF-8')
    #  #=> "=?UTF-8?B?VGhpcyBpcyDjgYIgc3RyaW5n?="
    def Encodings.b_value_encode(encoded_str, encoding = nil)
      return encoded_str if encoded_str.to_s.ascii_only?
      string, encoding = RubyVer.b_value_encode(encoded_str, encoding)
      map_lines(string) do |str|
        "=?#{encoding}?B?#{str.chomp}?="
      end.join(" ")
    end

    # Encode a string with Quoted-Printable Encoding and returns it ready to be inserted
    # as a value for a field, that is, in the =?<charset>?Q?<string>?= format
    #
    # Example:
    #
    #  Encodings.q_value_encode('This is あ string', 'UTF-8')
    #  #=> "=?UTF-8?Q?This_is_=E3=81=82_string?="
    def Encodings.q_value_encode(encoded_str, encoding = nil)
      return encoded_str if encoded_str.to_s.ascii_only?
      string, encoding = RubyVer.q_value_encode(encoded_str, encoding)
      string.gsub!("=\r\n", '') # We already have limited the string to the length we want
      map_lines(string) do |str|
        "=?#{encoding}?Q?#{str.chomp.gsub(/ /, '_')}?="
      end.join(" ")
    end

    private

    # Decodes a Base64 string from the "=?UTF-8?B?VGhpcyBpcyDjgYIgc3RyaW5n?=" format
    #
    # Example:
    #
    #  Encodings.b_value_decode("=?UTF-8?B?VGhpcyBpcyDjgYIgc3RyaW5n?=")
    #  #=> 'This is あ string'
    def Encodings.b_value_decode(str)
      RubyVer.b_value_decode(str)
    end

    # Decodes a Quoted-Printable string from the "=?UTF-8?Q?This_is_=E3=81=82_string?=" format
    #
    # Example:
    #
    #  Encodings.q_value_decode("=?UTF-8?Q?This_is_=E3=81=82_string?=")
    #  #=> 'This is あ string'
    def Encodings.q_value_decode(str)
      RubyVer.q_value_decode(str)
    end

    def Encodings.find_encoding(str)
      RUBY_VERSION >= '1.9' ? str.encoding : $KCODE
    end

    # Gets the encoding type (Q or B) from the string.
    def Encodings.value_encoding_from_string(str)
      str[ENCODED_VALUE, 1]
    end

    # When the encoded string consists of multiple lines, lines with the same
    # encoding (Q or B) can be joined together.
    #
    # String has to be of the format =?<encoding>?[QB]?<string>?=
    def Encodings.collapse_adjacent_encodings(str)
      results = []
      previous_encoding = nil
      lines = str.split(FULL_ENCODED_VALUE)
      lines.each_slice(2) do |unencoded, encoded|
        if encoded
          encoding = value_encoding_from_string(encoded)
          if encoding == previous_encoding && Utilities.blank?(unencoded)
            results.last << encoded
          else
            results << unencoded unless unencoded == EMPTY
            results << encoded
          end
          previous_encoding = encoding
        else
          results << unencoded
        end
      end

      results
    end
  end
end
