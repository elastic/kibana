# encoding: utf-8
# frozen_string_literal: true
require 'mail/encodings/7bit'

module Mail
  module Encodings
    class Base64 < SevenBit
      NAME = 'base64'
     
      PRIORITY = 3
 
      def self.can_encode?(enc)
        true
      end

      # Decode the string from Base64
      def self.decode(str)
        RubyVer.decode_base64( str )
      end
    
      # Encode the string to Base64
      def self.encode(str)
        ::Mail::Utilities.to_crlf(RubyVer.encode_base64( str ))
      end

      # Base64 has a fixed cost, 4 bytes out per 3 bytes in
      def self.cost(str)
        4.0/3
      end

      # Base64 inserts newlines automatically and cannot violate the SMTP spec.
      def self.compatible_input?(str)
        true
      end

      Encodings.register(NAME, self)      
    end
  end
end
