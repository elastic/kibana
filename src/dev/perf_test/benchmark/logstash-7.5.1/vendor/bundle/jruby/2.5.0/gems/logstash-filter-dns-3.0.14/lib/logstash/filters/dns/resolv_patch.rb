require "resolv"

jruby_gem_version = Gem::Version.new(JRUBY_VERSION)

# ref: https://github.com/logstash-plugins/logstash-filter-dns/issues/40
#
# JRuby 9k versions prior to 9.1.16.0 have a bug which crashes IP address
# resolution after 64k unique IP addresses resolutions.
#
# Note that the oldest JRuby version in LS 6 is 9.1.13.0 and
# JRuby 1.7.25 and 1.7.27 (the 2 versions used across LS 5) are not affected by this bug.
#
# The code below is copied from JRuby 9.1.16.0 resolv.rb:
# https://github.com/jruby/jruby/blob/9.1.16.0/lib/ruby/stdlib/resolv.rb#L775-L784
if jruby_gem_version >= Gem::Version.new("9.1.13.0") && jruby_gem_version < Gem::Version.new("9.1.16.0")
  class Resolv
    class DNS
      class Requester
        class UnconnectedUDP
          def sender(msg, data, host, port=Port)
            sock = @socks_hash[host.index(':') ? "::" : "0.0.0.0"]
            return nil if !sock
            service = [IPAddr.new(host), port]
            id = DNS.allocate_request_id(service[0], service[1])
            request = msg.encode
            request[0,2] = [id].pack('n')
            return @senders[[service, id]] =
                Sender.new(request, data, sock, host, port)
          end
        end
      end
    end
  end
end

# ref: https://github.com/logstash-plugins/logstash-filter-dns/issues/51
#
# JRuby versions starting at 9.2.0.0 have a bug caused by an upstream Ruby stdlib resolv.rb bug.
# This bug is essentially the same as the previous above bug where there is a leak between the
# DNS.allocate_request_id/DNS.free_request_id.
# This fix is required because starting at JRuby 9.2.0.0 the resolv.rb code was updated from the
# upstream Ruby stdlib code and the previous patch cannot be applied. Also this fix is better than the previous one.
if jruby_gem_version >= Gem::Version.new("9.2.0.0")
  # save verbose level and mute the "warning: already initialized constant"
  warn_level = $VERBOSE
  $VERBOSE = nil

  require_relative "resolv_9270"

  $VERBOSE = warn_level
end

# JRuby 1.x ships with a Ruby stdlib that has a bug in its resolv implementation
# in which it fails to correctly canonicalise unqualified or underqualified
# domains (e.g., domain names with fewer than the configured ndots, which defaults
# to 1).
#
# See: https://bugs.ruby-lang.org/issues/10412
#
# Conditionally apply the patch to the method definition by wrapping it at runtime.
if jruby_gem_version < Gem::Version.new("9.0")
  class Resolv::DNS
    class Config
      alias generate_candidates_without_toplevel generate_candidates
      def generate_candidates_with_toplevel(name)
        candidates = generate_candidates_without_toplevel(name)
        fname = Name.create("#{name}.")
        if !candidates.include?(fname)
          candidates << fname
        end
        candidates
      end
      alias generate_candidates generate_candidates_with_toplevel
    end
  end
end
