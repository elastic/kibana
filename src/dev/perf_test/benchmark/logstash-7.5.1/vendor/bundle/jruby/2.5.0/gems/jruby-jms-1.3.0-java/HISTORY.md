## 1.2.0 (2015-08-29)

* Tested against JRuby 9.0.0.0
* Drop support for JRuby 1.5 and 1.6
* Tested against ActiveMQ 5.11, and HornetQ 2.4
* Raises ArgumentError instead of RuntimeError for missing arguments
* Update tests
* Upgrade to Minitest 5.8
* Switch to Ruby 1.9 hash syntax
* Reformat code

## 1.1.0 (2014-04-10)

* Support Oracle AQ 11gR2
* Tibco EMS Examples
* Add .gemspec file

## 1.0.0 (2012-10-21)

* Issue #10 Support WebSphereMQ V7
* Issue #11 Add GenePool dependency for ConnectionPool
* Include version

## 0.11.2 (2011-06-01)

* Issue #8 Add ability to set Producer delivery mode using a Symbol
* Include ActiveMQ InVM working example along with Log4J properties file

## 0.11.1 (2011-05-25)

* Fixes the condition where a bad session keeps being re-used in a session pool.
  It is now removed from the pool anytime a JMS exception has occurred

## 0.11.0 (2011-04-18)

* Compatibility with JRuby 1.6
* I hate doing this, but unfortunately there is a small breaking change in this release:
    * We can no longer pass symbols into the following methods:
        * jms_delivery_mode
        * jms_delivery_mode=
    * Just rename existing uses of the above methods to:
        * jms_delivery_mode_sym
        * jms_delivery_mode_sym=
* Added Session Pool - requires GenePool as a dependency if used
* Generate warning log entry for any parameters not known to the ConnectionFactory
* Use java_import for all javax.jms classes
    * Rename all Java source files to match new names

## 0.10.1 (2011-02-21)

* Fix persistence typo and add message test cases

## 0.10.0 (2011-02-10)

* Refactoring interface

## 0.9.0 (2011-01-23)

* Revised API with cleaner interface
* Publish GEM

## 0.8.0 (2011-01-22)

* Release to the wild for general use

## 2008, 2009, 2010

* Previously known as jms4jruby
* Running in production at an enterprise processing a million messages a day
