# encoding: utf-8
def suppress_all_warnings
  old_verbose = $VERBOSE
  begin
    $VERBOSE = nil
    yield if block_given?
  ensure
    # always re-set to old value, even if block raises an exception
    $VERBOSE = old_verbose
  end
end

# create a new instance of the Java class File without shadowing the Ruby version of the File class
module JavaIO
  include_package "java.io"
end

