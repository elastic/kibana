# frozen-string-literal: true
#
# The thread_local_timezones extension allows you to set a per-thread timezone that
# will override the default global timezone while the thread is executing.  The
# main use case is for web applications that execute each request in its own thread,
# and want to set the timezones based on the request.
#
# To load the extension:
#
#   Sequel.extension :thread_local_timezones
#
# The most common example is having the database always store time in
# UTC, but have the application deal with the timezone of the current
# user.  That can be done with:
#
#   Sequel.database_timezone = :utc
#   # In each thread:
#   Sequel.thread_application_timezone = current_user.timezone
#
# This extension is designed to work with the named_timezones extension.
#
# This extension adds the thread_application_timezone=, thread_database_timezone=,
# and thread_typecast_timezone= methods to the Sequel module.  It overrides
# the application_timezone, database_timezone, and typecast_timezone
# methods to check the related thread local timezone first, and use it if present.
# If the related thread local timezone is not present, it falls back to the
# default global timezone.
#
# There is one special case of note.  If you have a default global timezone
# and you want to have a nil thread local timezone, you have to set the thread
# local value to :nil instead of nil:
#
#   Sequel.application_timezone = :utc
#   Sequel.thread_application_timezone = nil
#   Sequel.application_timezone # => :utc
#   Sequel.thread_application_timezone = :nil
#   Sequel.application_timezone # => nil
#
# Related module: Sequel::ThreadLocalTimezones

#
module Sequel
  module ThreadLocalTimezones
    %w'application database typecast'.each do |t|
      class_eval("def thread_#{t}_timezone=(tz); Thread.current[:#{t}_timezone] = convert_timezone_setter_arg(tz); end", __FILE__, __LINE__)
      class_eval(<<END, __FILE__, __LINE__ + 1)
        def #{t}_timezone
          if tz = Thread.current[:#{t}_timezone]
            tz unless tz == :nil
          else
            super
          end
        end
END
    end
  end
  
  extend ThreadLocalTimezones
end
