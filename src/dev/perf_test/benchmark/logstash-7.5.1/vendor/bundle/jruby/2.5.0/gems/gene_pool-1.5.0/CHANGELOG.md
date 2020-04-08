GenePool Changelog
=====================

1.5.0 / 2019-02-11
  - Replace deprecated `thread_safe` gem with `concurrent-ruby`.
  - Update tests with latest mini-test spec.
  - Update Readme.

1.4.1 / 2014-04-29
  - Close connection outside of the mutex.
  - When iterating over the connections, don't include connections still in the process of being created (set to the reserved_placeholder).

1.4.0 / 2014-04-18

  - Use Monitor instead of Mutex for locking to prevent recursive lock issues.
  - Fix tests where Timeout.timeout without passing exception in raises unrescueable Timeout::Error in ruby 2.1 so cleanup does not occur.
  - Allow option timeout_class which will get raised instead of Timeout::Error

1.3.2 / 2014-01-06

  - Fix bug where connections that failed renew and were nil were attempting to be released.  (Which would generally swallow the originating exception).

1.3.1 / 2013-12-05

  - close_connection(): close method is correctly invoked when @close_proc is Symbol and connection overrides send() (LMolr)

1.3.0 / 2012-09-10

  - Allow :timeout option to raise Timeout::Error if waiting for a connection exceeds this value.

1.2.4 / 2012-09-05

  - require 'thread' under ruby 1.8 so that mutex is defined (Thanks soupmatt!)

1.2.3 / 2012-02-23

  - Allow setting of options[:close_proc] to nil

1.2.2 / 2012-02-23

  - Do a respond_to? to check compatibility instead of hacking around with $VERBOSE

1.2.1 / 2012-02-23

  - Oops, broke 1.8 compatibility with 1.2.0.  Hacking $VERBOSE setting so as to not spam deprecation warnings.

1.2.0 / 2012-02-23

  - Allow dynamic modification of pool size.
  - Added close method which will prevent checking out of new connections and wait for and close all current connections.
  - Added remove_idle method which will close all current connections which have been idle for the given idle_time.
  - with_connection_auto_retry no longer accepts an argument (it defaulted to true previously) because of the addition
    of the close_proc option which defaults to :close.  This should be set to nil if no closing is necessary
    (Deepest apologies for making an incompatible change if anyone is actually using this argument).

1.1.1 / 2010-11-18

  - In with_connection_auto_retry, add check for e.message =~ /expired/ as JRuby exception won't be a
    Timeout::Error at this point (http://jira.codehaus.org/browse/JRUBY-5194)

1.1.0 / 2010-11-11

  - Added with_connection_auto_retry to automatically retry yield block if a non-timeout exception occurs

1.0.1 / 2010-09-12

  - Debug logging was NOT thread-safe

1.0.0 / 2010-09-05

  - Initial release
