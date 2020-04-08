## master (unreleased)


## 1.7.0
  - Refactoring by extracting formatters into their own classes [@waldyr] - [#237]
  - Fixes Travis builds and improves tests [@nviennot], [@waldyr], [@gerrywastaken] - [#225], [#228], [#229], [#230], [#231]
  - Creates `awesome_object_data` to encapsulate the logic of printing object internals,
  so Structs and Objects can be printed as one [@waldyr] - [#226]
  - Fixes development dependencies for environments without rake [@aleandros], [@cyberdelia] - [#222], [#216]
  - Documents `ai` method usage [@MaxPleaner] - [#217]
  - Fixes conflict with `mail` and other gems which fake ActiveSupport [@kemmason] - [#200]
  - Improves spec performance and simplicity [@maurogeorge]
  - Handle objects that have a custom #to_hash method [@clonezone]

## 1.6.1
  - Fixes specs on all rails dependencies (Mauro George)
  - Updates specs for mongoid, mongo_mapper and ripple (James Cox)
  - Adds appraisals for simpler version/scenario management (Mauro George)
  - Add Travis (Mauro George)
  - Update documentation (Mauro George)

## 1.6.0
  semi-major release since it's been a while, and there are several
  improvements.
  - Improves support for new mongoid/moped (Velkitor, Francois Bernier et al)
  - Converts specs to rspec 3+ (Adam Jonas, James Cox)
  - Fixes incompatibility with IPAddr (James Cox, Michael Dvorkin)
  - Fixes incompatibility with the money gem (Michael Dvorkin)
  - Fixes AR::Relation presentation (Sergey Ponomarov)
  - Lazy-loads ActionView (Akira Matsuda)
  - Fixes inspection of abstract classes (Jonathan Priddle)
  - Gets most specs passing, and fixes suite (Eoin Kelly)

## 1.2.0
#### NOTE: This is the *last* release supporting Ruby < v1.9.3 and Rails < v3.
  - Added Sequel ORM plugin (Jonathan Davies)
  - Added Ripple plugin (Ruby modeling layer for Riak, Scott Hyndman)
  - Added NoBrainer plugin (Ruby ORM for RethinkDB, Nicolas Viennot)
  - Added formatting for Ruby set objects (Richard Hall)
  - Fixed HTML formatting (Mike McQuaid)
  - Other minor bugs and enhancements

## 1.1.0
  - Objects are no longer recursively formatted by default. Reenable by using :raw => true option.
  - ap(object) now returns nil when running under IRB or Pry
  - Added support for Mongoid 3 and Moped (Nikolaj Nikolajsen)
  - Improved formatting of MongoMapper objects (George .)
  - ActiveRecord::Relation now renders as array (Dan Lynn)
  - Formatting BigDecimal no longer looses precision (Evan Senter)
  - Added AwesomePrint.irb! and AwesomePrint.pry! convenience methods
  - Fixed conflict with the colorize gem
  - Misc tweaks and bug fixes

## 1.0.2
  - Added formatting of Mongoid documents (Adam Doppelt)
  - ActiveRecord objects display attributes only. Use :raw => true to display the entire object
  - ActiveSupport::Date objects get formatted as regular Date
  - Rails.logger.ap colorizes output based on ActiveSupport::LogSubscriber.colorize_logging (default is true)
  - Improved formatting of methods array

## 1.0.1
  - Updated repo tags for Rubygems.org

## 1.0.0 Thanksgiving edition
  - Added ability to format *arbitrary* Ruby object
  - Added :limit option to limit large output for arrays and hashes (Andrew Horsman)
  - Improved HTML formatting when :html => true (Daniel Johnson)
  - Added Mongoid extension (Adam Doppelt)
  - Added Nokogiri extension (Adam Doppelt)
  - Removed Jeweler gem dependency

## 0.4.0
  - 'ap object' now returns the object (Stephan Hagemann)
  - Added :html => true option to enable HTML colors rather that ANSI (ex. Sinatra templates)
  - Added AwesomePrint.force_colors! to allow color output on demand (Andrew O'Brien)
  - Added MongoMapper formatter mixin (Elpizo Choi)
  - Fixed formatting of methods array when object#method is overridden
  - Fixed potential stack errors by checking whether AwesomePrint is already loaded
  - Improved Ruby 1.8.6 and 1.8.7 compatibility
  - Improved Windows compatibility (Viktar Basharymau)

## 0.3.2
  - Make sure Rails mixins get loaded in Rails console when required from .irbrc
  - Fixed an issue with classes that define their own #send method (ex: Socket)
  - Fixed compatibility issue with Liquid gem that defines Module#liquid_methods
  - Fixed hash spec for Ruby < 1.9 where order of hash keys is not guaranteed
  - Added :sorted_hash_keys option to sort hash keys (Ed Ruder)

## 0.3.1 RubyConf X edition
  - Fixed Ruby 1.8.6 compatibility issues (thanks, Tim!)
  - Fixed stack overflow issue with Rails 2.3.x console

## 0.3.0
  - Display object.methods and family in human readable format
  - Objects inherited from Array, Hash, File, Dir, and Struct are shown as their base class
  - Added option to suppress array index in output (Sean Gallagher)
  - Updated README on how to set up ~/.irbrc for MacRuby (Eloy Duran)
  - Specs pass 100% with Ruby 1.8.7/RSpec 1.3 and Ruby 1.9.2/RSpec 2.0

## 0.2.1
  - ap can now be used within Rails templates (ex. <%= ap object %>)
  - Added support for printing Struct

## 0.2.0
  - Added support for logger.ap (including Rails logger)
  - Added support for HashWithIndifferentAccess from ActiveSupport
  - ap now works with scripts that use ActiveRecord/ActiveSupport outside Rails
  - ap now correctly shows file and directory names with fancy characters (shell escape)

## 0.1.4
  - Format BigDecimal and Rational objects as Float scalars
  - Explicit options parameter can override custom defaults
  - Custom defaults are not interfering when running specs
  - Custom defaults now work correctly with Ruby 1.9.x

## 0.1.3
  - Added support for setting custom defaults in ~/.aprc

## 0.1.2
  - Correctly handle empty arrays and hashes
  - Use alias_method instead of alias (fixes non-tty method aliasing)
  - Added awesome_inspect method

## 0.1.1
  - Added support for tableless ActiveRecord models
  - Left align hash keys if @options[:indent] is negative

## 0.1.0
  - Initial Release.

  [#200]: https://github.com/awesome-print/awesome_print/pull/200
  [#216]: https://github.com/awesome-print/awesome_print/pull/216
  [#217]: https://github.com/awesome-print/awesome_print/pull/217
  [#222]: https://github.com/awesome-print/awesome_print/pull/222
  [#225]: https://github.com/awesome-print/awesome_print/pull/225
  [#226]: https://github.com/awesome-print/awesome_print/pull/226
  [#228]: https://github.com/awesome-print/awesome_print/pull/228
  [#229]: https://github.com/awesome-print/awesome_print/pull/229
  [#230]: https://github.com/awesome-print/awesome_print/pull/230
  [#231]: https://github.com/awesome-print/awesome_print/pull/231
  [#232]: https://github.com/awesome-print/awesome_print/pull/232
  [#237]: https://github.com/awesome-print/awesome_print/pull/237

  [@aleandros]: https://github.com/aleandros
  [@clonezone]: https://github.com/clonezone
  [@cyberdelia]: https://github.com/cyberdelia
  [@gerrywastaken]: https://github.com/gerrywastaken
  [@kemmason]: https://github.com/kemmason
  [@maurogeorge]: https://github.com/maurogeorge
  [@MaxPleaner]: https://github.com/MaxPleaner
  [@nviennot]: https://github.com/nviennot
  [@waldyr]: https://github.com/waldyr
