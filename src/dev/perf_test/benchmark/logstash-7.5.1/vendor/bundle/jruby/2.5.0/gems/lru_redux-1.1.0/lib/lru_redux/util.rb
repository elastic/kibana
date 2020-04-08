require 'lru_redux/util/safe_sync'

require 'lru_redux/util/safe_sync_jruby' if
    RUBY_ENGINE == 'jruby' && JRUBY_VERSION < '9.0'
