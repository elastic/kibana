# frozen_string_literal: true

if ENV["COVERAGE"]
  require "simplecov"
  SimpleCov.start

  require "codecov"
  SimpleCov.formatter = SimpleCov::Formatter::Codecov
end

require "minitest/autorun"
require "minitest/reporters"
require "mocha/setup"

Minitest::Reporters.use! Minitest::Reporters::DefaultReporter.new(color: true)

$LOAD_PATH.unshift File.expand_path("../lib", __dir__)
require "public_suffix"
