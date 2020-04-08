require "resolv"

# ref:
#   https://github.com/logstash-plugins/logstash-filter-dns/issues/51
#   https://github.com/jruby/jruby/pull/5722
#
# JRuby versions starting at 9.2.0.0 have a bug in resolv.rb with a leak between the
# DNS.allocate_request_id/DNS.free_request_id methods.
#
# We are opting to load a patched full resolv.rb instead of monkey patching the
# offending methods because we do not yet know in which upcoming version of JRuby
# this will be fixed and we want to avoid potential conflicting monkey patches.
# A spec which will break on JRuby upgrade will redirect here
# to make a manual verification and eventually remove that patch here once the fix is
# made in the JRuby version of resolv.rb.

if Gem::Version.new(JRUBY_VERSION) >= Gem::Version.new("9.2.0.0")
  # save verbose level and mute the "warning: already initialized constant"
  warn_level = $VERBOSE
  $VERBOSE = nil

  require_relative "resolv_9270"

  $VERBOSE = warn_level
end
