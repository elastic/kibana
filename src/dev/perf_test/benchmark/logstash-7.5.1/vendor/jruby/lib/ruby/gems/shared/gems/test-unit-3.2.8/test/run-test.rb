#!/usr/bin/env ruby

$VERBOSE = true

$KCODE = "utf8" unless "".respond_to?(:encoding)

base_dir = File.expand_path(File.join(File.dirname(__FILE__), ".."))
lib_dir = File.join(base_dir, "lib")
test_dir = File.join(base_dir, "test")

$LOAD_PATH.unshift(lib_dir)

require 'test/unit'

test_unit_notify_base_dir = File.join(base_dir, "..", "test-unit-notify")
test_unit_notify_base_dir = File.expand_path(test_unit_notify_base_dir)
if File.exist?(test_unit_notify_base_dir)
  $LOAD_PATH.unshift(File.join(test_unit_notify_base_dir, "lib"))
  require 'test/unit/notify'
end

exit Test::Unit::AutoRunner.run(true, test_dir)
