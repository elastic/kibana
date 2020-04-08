module Puma

  # Provides an IO-like object that always appears to contain no data.
  # Used as the value for rack.input when the request has no body.
  #
  class NullIO
    # Always returns nil
    #
    def gets
      nil
    end

    # Never yields
    #
    def each
    end

    # Mimics IO#read with no data
    #
    def read(count=nil,buffer=nil)
      (count && count > 0) ? nil : ""
    end

    # Does nothing
    #
    def rewind
    end

    # Does nothing
    #
    def close
    end
  end
end
