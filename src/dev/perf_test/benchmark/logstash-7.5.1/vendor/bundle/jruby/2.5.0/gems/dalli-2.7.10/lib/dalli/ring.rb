# frozen_string_literal: true
require 'digest/sha1'
require 'zlib'

module Dalli
  class Ring
    POINTS_PER_SERVER = 160 # this is the default in libmemcached

    attr_accessor :servers, :continuum

    def initialize(servers, options)
      @servers = servers
      @continuum = nil
      if servers.size > 1
        total_weight = servers.inject(0) { |memo, srv| memo + srv.weight }
        continuum = []
        servers.each do |server|
          entry_count_for(server, servers.size, total_weight).times do |idx|
            hash = Digest::SHA1.hexdigest("#{server.name}:#{idx}")
            value = Integer("0x#{hash[0..7]}")
            continuum << Dalli::Ring::Entry.new(value, server)
          end
        end
        @continuum = continuum.sort_by(&:value)
      end

      threadsafe! unless options[:threadsafe] == false
      @failover = options[:failover] != false
    end

    def server_for_key(key)
      if @continuum
        hkey = hash_for(key)
        20.times do |try|
          entryidx = binary_search(@continuum, hkey)
          server = @continuum[entryidx].server
          return server if server.alive?
          break unless @failover
          hkey = hash_for("#{try}#{key}")
        end
      else
        server = @servers.first
        return server if server && server.alive?
      end

      raise Dalli::RingError, "No server available"
    end

    def lock
      @servers.each(&:lock!)
      begin
        return yield
      ensure
        @servers.each(&:unlock!)
      end
    end

    private

    def threadsafe!
      @servers.each do |s|
        s.extend(Dalli::Threadsafe)
      end
    end

    def hash_for(key)
      Zlib.crc32(key)
    end

    def entry_count_for(server, total_servers, total_weight)
      ((total_servers * POINTS_PER_SERVER * server.weight) / Float(total_weight)).floor
    end

    # Native extension to perform the binary search within the continuum
    # space.  Fallback to a pure Ruby version if the compilation doesn't work.
    # optional for performance and only necessary if you are using multiple
    # memcached servers.
    begin
      require 'inline'
      inline do |builder|
        builder.c <<-EOM
        int binary_search(VALUE ary, unsigned int r) {
            long upper = RARRAY_LEN(ary) - 1;
            long lower = 0;
            long idx = 0;
            ID value = rb_intern("value");
            VALUE continuumValue;
            unsigned int l;

            while (lower <= upper) {
                idx = (lower + upper) / 2;

                continuumValue = rb_funcall(RARRAY_PTR(ary)[idx], value, 0);
                l = NUM2UINT(continuumValue);
                if (l == r) {
                    return idx;
                }
                else if (l > r) {
                    upper = idx - 1;
                }
                else {
                    lower = idx + 1;
                }
            }
            return upper;
        }
        EOM
      end
    rescue LoadError
      # Find the closest index in the Ring with value <= the given value
      def binary_search(ary, value)
        upper = ary.size - 1
        lower = 0

        while (lower <= upper) do
          idx = (lower + upper) / 2
          comp = ary[idx].value <=> value

          if comp == 0
            return idx
          elsif comp > 0
            upper = idx - 1
          else
            lower = idx + 1
          end
        end
        upper
      end
    end

    class Entry
      attr_reader :value
      attr_reader :server

      def initialize(val, srv)
        @value = val
        @server = srv
      end
    end

  end
end
