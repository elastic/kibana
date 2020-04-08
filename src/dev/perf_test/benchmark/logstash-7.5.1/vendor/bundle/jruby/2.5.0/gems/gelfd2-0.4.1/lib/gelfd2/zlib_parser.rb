require 'zlib'
module Gelfd2
  class ZlibParser

    def self.parse(data)
      begin
        t = Zlib::Inflate.inflate(data)
        t
      rescue Exception => e
        raise DecodeError, "Failed to decode data: #{e}"
      end
    end

  end
end
