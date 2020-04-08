# frozen-string-literal: true

module Sequel
  # The major version of Sequel.  Only bumped for major changes.
  MAJOR = 5

  # The minor version of Sequel.  Bumped for every non-patch level
  # release, generally around once a month.
  MINOR = 27

  # The tiny version of Sequel.  Usually 0, only bumped for bugfix
  # releases that fix regressions from previous versions.
  TINY  = 0
  
  # The version of Sequel you are using, as a string (e.g. "2.11.0")
  VERSION = [MAJOR, MINOR, TINY].join('.').freeze

  # The version of Sequel you are using, as a number (2.11.0 -> 20110)
  VERSION_NUMBER = MAJOR*10000 + MINOR*10 + TINY
  
  # The version of Sequel you are using, as a string (e.g. "2.11.0")
  def self.version
    VERSION
  end
end
