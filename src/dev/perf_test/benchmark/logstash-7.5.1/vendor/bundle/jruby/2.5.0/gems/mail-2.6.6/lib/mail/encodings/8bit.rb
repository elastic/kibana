# encoding: utf-8
# frozen_string_literal: true
require 'mail/encodings/binary'

module Mail
  module Encodings
    class EightBit < Binary
      NAME = '8bit'

      PRIORITY = 4

      # 8bit is an identiy encoding, meaning nothing to do
      
      # Decode the string
      def self.decode(str)
        ::Mail::Utilities.to_lf str
      end
    
      # Encode the string
      def self.encode(str)
        ::Mail::Utilities.to_crlf str
      end
     
      # Idenity encodings have a fixed cost, 1 byte out per 1 byte in
      def self.cost(str)
        1.0
      end

      # Per RFC 2821 4.5.3.1, SMTP lines may not be longer than 1000 octets including the <CRLF>.
      def self.compatible_input?(str)
        !str.lines.find { |line| line.length > 998 }
      end

      Encodings.register(NAME, self) 
    end
  end
end
