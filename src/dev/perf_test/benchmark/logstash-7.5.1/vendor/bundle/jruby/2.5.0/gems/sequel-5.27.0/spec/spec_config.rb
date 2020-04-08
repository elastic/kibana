ENV['SEQUEL_POSTGRES_URL'] ||= 'postgres:///sequel_test?user=sequel_test&password=2a9db12d8f993248'
ENV['SEQUEL_SQLITE_URL'] ||= 'sqlite:/'
gem 'minitest'
require 'minitest'
require 'minitest/autorun'
#at_exit{GC.stress = true}
if false # Minitest.respond_to?(:before_parallel_fork)
  if SEQUEL_ADAPTER_TEST.to_s == 'postgres'
    Minitest.before_parallel_fork{DB.disconnect}
    Minitest.after_parallel_fork{|i|DB.opts[:database] += (i+1).to_s; DB.extension :pg_array, :pg_hstore}
  end
end
