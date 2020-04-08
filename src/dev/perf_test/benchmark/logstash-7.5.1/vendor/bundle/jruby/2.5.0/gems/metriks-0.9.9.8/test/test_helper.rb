require 'test/unit'
require 'pp'

require 'mocha'

require 'metriks'

Thread.abort_on_exception = true

module ThreadHelper
  require 'thread'

  # Run the given block on n threads in parallel. Returns an array of the
  # return values of each thread's last invocation of block. Options:

  # :n: call block n times per thread. Default 1.
  def thread(threads = 2, opts = {})
    n = opts[:n] || 1
    results = []
   
    threads.times.map do |i|
      Thread.new do
        n.times do
          results[i] = yield i
        end
      end
    end.each do |thread|
      thread.join
    end
    
    results
  end
end
