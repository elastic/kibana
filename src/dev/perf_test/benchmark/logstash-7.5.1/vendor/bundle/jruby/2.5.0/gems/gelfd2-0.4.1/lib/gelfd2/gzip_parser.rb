require 'zlib'
module Gelfd2
  class GzipParser

    def self.parse(data)
      begin
        t = Zlib::GzipReader.new(StringIO.new(data))
        t.read
      #raise NotYetImplementedError, "GZip decoding is not yet implemented"
      rescue Exception => e
        raise DecodeError, "Failed to decode data: #{e}"
      end
    end

  end
end
