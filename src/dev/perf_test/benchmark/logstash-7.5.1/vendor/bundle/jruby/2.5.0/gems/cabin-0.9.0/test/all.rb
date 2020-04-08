require "test_helper"

base_dir = File.join(File.expand_path(File.dirname(__FILE__)), "cabin")

Dir.glob(File.join(base_dir, "test_*.rb")).each do |path|
  puts "Loading tests from #{path}"
  if path =~ /test_zeromq/
    puts "Skipping zeromq tests because they force ruby to exit if libzmq is not found"
    next
  end
  require path
end
