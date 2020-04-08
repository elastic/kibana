## [v1.1.2](https://github.com/yuki24/did_you_mean/tree/v1.1.2)

_<sup>released at 2017-09-24 07:28:48 UTC</sup>_

**This version is compatible with Ruby 2.4 and older**

#### Bug Fixes

- Fixed a bug where `did_you_mean` shows duplicate suggestions when the exception is raised multiple times ([#84](https://github.com/yuki24/did_you_mean/pull/84), [<tt>c2e4008</tt>](https://github.com/yuki24/did_you_mean/commit/c2e40083cef604c00ccd10efc6d7a5036ad9eb5b))

## [v1.1.1](https://github.com/yuki24/did_you_mean/tree/v1.1.1)

_<sup>released at 2017-09-24 07:24:02 UTC</sup>_

### This version has been yanked from Rubygems.org and is not available.

## [v1.1.0](https://github.com/yuki24/did_you_mean/tree/v1.1.0)

_<sup>released at 2016-12-19 23:19:06 UTC</sup>_

The version `1.1.0` only has support for Ruby 2.4.0 and later. Also, all patch releasess under `1.1.*` will only be compatible with Ruby 2.4.0 and later as well. Versions under `1.0.*` will still be maintained until Ruby 2.3 is deprecated. Any other versions below `1.0` will no longer be maintained.

#### New Features

- Suggest a method name on a NameError from the `Struct#[]` or `Struct#[]=` method ([#73](https://github.com/yuki24/did_you_mean/pull/73)):

    ```ruby
    Struct.new(:foo).new[:fooo]
    # => NameError: no member 'fooo' in struct
    # Did you mean? foo
    # foo=
    ```

- Added a public interface for the gem's spell checker:

    ```ruby
    DidYouMean::SpellChecker.new(dictionary: ['email', 'fail', 'eval']).correct('meail')
    # => ['email']
    ```

- Methods defined on `nil` by default are no longer suggested. Note that methods, defined after the gem is loaded, will still be suggested (e.g. ActiveSupport).

#### Bug Fixes

- Fixed a bug where private method names were added to the dictionary when an argument was passed in to a public method. Use the `NoMethodError#private_call?` method instead ([<tt>0a1b761</tt>](https://github.com/yuki24/did_you_mean/commit/0a1b7612252055e583a373b473932f789381ca0f))

## [v1.0.3](https://github.com/yuki24/did_you_mean/tree/v1.0.3)

_<sup>released at 2017-09-24 07:22:07 UTC</sup>_

**This version is compatible with Ruby 2.3 and older**

#### Bug Fixes

- Fixed a bug where `did_you_mean` shows duplicate suggestions when the exception is raised multiple times ([#84](https://github.com/yuki24/did_you_mean/pull/84), [<tt>c2e4008</tt>](https://github.com/yuki24/did_you_mean/commit/c2e40083cef604c00ccd10efc6d7a5036ad9eb5b))

## [v1.0.2](https://github.com/yuki24/did_you_mean/tree/v1.0.2)

_<sup>released at 2016-11-20 18:03:07 UTC</sup>_

**This version is compatible with Ruby 2.3 and older**

#### Features

- Experimental features are officially available through `require 'did_you_mean/experimental'`

#### Deprecations

- `require 'did_you_mean/extra_features'` is now deprecated in favor of `require 'did_you_mean/experimental'`

#### Internal Changes

- Replaced the `DidYouMean::SpellCheckable` module with the `DidYouMean::SpellChecker` class. This is a slower implementation but close to the model explained in [this talk](https://speakerdeck.com/yuki24/saving-people-from-typos), more reusable and possibly makes it easier to expose the class as a public interface.

## [v1.0.1](https://github.com/yuki24/did_you_mean/tree/v1.0.1)

_<sup>released at 2016-05-15 05:17:22 UTC</sup>_

#### Bug Fixes

- Fixed a bug where the gem suggests what is actually typed by the user: [<tt>1c52c88</tt>](https://github.com/yuki24/did_you_mean/commit/1c52c887c62b0921e799f94bcc4a846dc7cbc057)
- Fixed features that didn't work on JRuby 9.1.0.0: [<tt>dc48dde</tt>](https://github.com/yuki24/did_you_mean/commit/dc48dde1b2a8f05aab1fcf897e1cb3075a206f53), [<tt>4de23f8</tt>](https://github.com/yuki24/did_you_mean/commit/4de23f880502c80c5f321371d39c08bb0fa34040), [<tt>00e3059</tt>](https://github.com/yuki24/did_you_mean/commit/00e305971060d150fae4817b5e895d6478b37579). The local variable name correction is still disabled. Also see: [jruby/jruby#3480](https://github.com/jruby/jruby/issues/3480)

## [v1.0.0](https://github.com/yuki24/did_you_mean/tree/v1.0.0)

_<sup>released at 2015-12-25 05:13:04 UTC</sup>_

#### Features

- Introduced a [verbose formatter](https://github.com/yuki24/did_you_mean#verbose-formatter)
- Introduced an easy way to enabling [experimental features](https://github.com/yuki24/did_you_mean#experimental-features)

#### Bug Fixes

- Fixed a bug where the Jaro-Winkler implementation returns the wrong distance when 2 identical strings are given. fixes [#58](https://github.com/yuki24/did_you_mean/pull/58)

#### Internal Changes

- Slightly changed the spell checking algorithm. Take a look at [<tt>e2f5b24</tt>](https://github.com/yuki24/did_you_mean/commit/e2f5b2437f967565e4830eab6077f73ae166e0a7) for more details. fixes [#60](https://github.com/yuki24/did_you_mean/issues/60)

## [v1.0.0.rc1](https://github.com/yuki24/did_you_mean/tree/v1.0.0.rc1)

_<sup>released at 2015-12-25 05:02:25 UTC</sup>_

#### Internal Chagens

- No longer uses `TracePoint` API by default. fixes [#55](https://github.com/yuki24/did_you_mean/issues/55) and [#56](https://github.com/yuki24/did_you_mean/issues/56)

## [v1.0.0.beta3](https://github.com/yuki24/did_you_mean/tree/v1.0.0.beta3)

_<sup>released at 2015-12-25 04:56:13 UTC</sup>_

#### Internal Changes

- Use the `frozen-string-literal` pragma rather than calling `.freeze` everywhere
- Use the `NameError#receiver` method in `DidYouMean:: ClassNameChecker` to know the namespace where the constant call is made
- Refactored the `SpellCheckerTest`

## [v1.0.0.beta2](https://github.com/yuki24/did_you_mean/tree/v1.0.0.beta2)

_<sup>released at 2015-12-25 04:50:36 UTC</sup>_

#### Bug Fixes

- Fixed a bug where the gem doesn't install properly on Ruby 2.3.0dev

## [v1.0.0.beta1](https://github.com/yuki24/did_you_mean/tree/v1.0.0.beta1)

_<sup>released at 2015-12-25 05:27:53 UTC</sup>_

#### Breaking Changes

- Dropped support for MRIs older than 2.3, JRuby and Rubinus

#### Internal Changes

- The C extension has been removed since the `NameError#receiver` method has become part of the MRI 2.3
- The interception gem has been removed from the dependencies
- Removed code that was needed to support multiple Ruby implementations

## [v0.10.0](https://github.com/yuki24/did_you_mean/tree/v0.10.0)

_<sup>released at 2015-08-21 06:44:11 UTC</sup>_

#### Features

- Now it corrects an instance variable name if the ivar name is mistyped and `NoMethodError` is raised:

```ruby
@number = 1
@nubmer.zero?
# => NoMethodError: undefined method `zero?' for nil:NilClass
#
#     Did you mean? @number
#
```

- Support for JRuby 9.0.0.0
- Prefix-based correction ( [@tjohn](https://github.com/tjohn), [#50](https://github.com/yuki24/did_you_mean/issues/50 "Match start of method name"), [#49](https://github.com/yuki24/did_you_mean/issues/49 "Use Jaro distance instead of Jaro-Winkler distance"))
- Correction search is about 75% faster than 0.9.10

#### Breaking Changes

- The ActiveRecord integration has been removed

## [v0.9.10](https://github.com/yuki24/did_you_mean/tree/v0.9.10)

_<sup>released at 2015-05-14 03:04:47 UTC</sup>_

#### Bug Fixes

- Fixed a bug where a duplicate "did you mean?" message was appended each time `#to_s` is called ( [@danfinnie](https://github.com/danfinnie), [#51](https://github.com/yuki24/did_you_mean/issues/51 "Duplicate output for constants in separate gem"))

## [v0.9.9](https://github.com/yuki24/did_you_mean/tree/v0.9.9)

_<sup>released at 2015-05-13 03:48:19 UTC</sup>_

#### Features

- Order word suggestions based on Levenshtein distance ( [@tleish](https://github.com/tleish), [#31](https://github.com/yuki24/did_you_mean/pull/31))

#### Internal Changes

- Reduce memory allocation by about 40%
- Speed up Levenshtein distance calculation by about 40%
- The Java extension has been replaced with a pure JRuby implementation

## [v0.9.8](https://github.com/yuki24/did_you_mean/tree/v0.9.8)

_<sup>released at 2015-04-12 01:55:27 UTC</sup>_

#### Internal Changes

- Speed up Levenshtein by 50% and reduce 97% of memory usage

## [v0.9.7](https://github.com/yuki24/did_you_mean/tree/v0.9.7)

_<sup>released at 2015-04-02 04:20:26 UTC</sup>_

#### Bug Fixes

- Fixed an issue where _did\_you\_mean_ doesn't install on JRuby properly.

## [v0.9.6](https://github.com/yuki24/did_you_mean/tree/v0.9.6)

_<sup>released at 2015-01-24 23:19:27 UTC</sup>_

#### Bug Fixes

- Fixed a bug where did\_you\_mean incorrectly suggests protected methods when it just isn't callable ( [@glittershark](https://github.com/glittershark), [#34](https://github.com/yuki24/did_you_mean/issues/34 "Did\_you\_mean incorrectly called when attempting to call protected/private method"))

## [v0.9.5](https://github.com/yuki24/did_you_mean/tree/v0.9.5)

_<sup>released at 2015-01-07 12:41:23 UTC</sup>_

#### Bug Fixes

- Whitelist `#safe_constantize` method from `ActiveSupport::Inflector` to avoid significant performance slowdown ( [@tleish](https://github.com/tleish), [#19](https://github.com/yuki24/did_you_mean/issues/19 "Significant Slowdown when Using Debugger"), [#20](https://github.com/yuki24/did_you_mean/pull/20 "Whitelisting safe\_constantize (ActiveSupport::Inflector) method"))

## [v0.9.4](https://github.com/yuki24/did_you_mean/tree/v0.9.4)

_<sup>released at 2014-11-19 20:00:00 UTC</sup>_

#### Bug Fixes

- Fixed a bug where no suggestions will be made on JRuby

## [v0.9.3](https://github.com/yuki24/did_you_mean/tree/v0.9.3)

_<sup>released at 2014-11-18 03:50:11 UTC</sup>_

**This version has been yanked from rubygems.org as it doesn't work with jRuby at all. Please upgrade to 0.9.4 or higher as soon as possible.**

#### Internal Changes

- Replaced the crazy C extension with a so much better one (thanks to [@nobu](https://github.com/nobu)!)

## [v0.9.2](https://github.com/yuki24/did_you_mean/tree/v0.9.2)

_<sup>released at 2014-11-17 15:32:33 UTC</sup>_

#### Bug Fixes

- Fixed a bug where did\_you\_mean doesn't compile on Ruby 2.1.2/2.1.5 ( [#16](https://github.com/yuki24/did_you_mean/issues/16 "Gem building failed on Debian 6.0.10 x86\_64"))

## [v0.9.1](https://github.com/yuki24/did_you_mean/tree/v0.9.1)

_<sup>released at 2014-11-16 18:54:24 UTC</sup>_

**This version has been yanked from rubygems.org as it doesn't compile on Ruby 2.1.2 and 2.1.5. Please upgrade to 0.9.4 or higher as soon as possible.**

#### Internal Changes

- Shrink the gem size by removing unneeded ruby header files.
- Now it forces everyone to upgrade the gem when they upgrade Ruby to a new version. This avoids introducing a bug like [#14](https://github.com/yuki24/did_you_mean/issues/14 "Compatibility with `letter\_opener` gem").

## [v0.9.0](https://github.com/yuki24/did_you_mean/tree/v0.9.0)

_<sup>released at 2014-11-09 01:26:31 UTC</sup>_

#### Features

- did\_you\_mean now suggests instance variable names if `@` is missing ( [#12](https://github.com/yuki24/did_you_mean/issues/12 "Suggest instance- and class-vars"), [<tt>39d1e2b</tt>](https://github.com/yuki24/did_you_mean/commit/39d1e2bd66d6ff8acbc4dd5da922fc7e5fcefb20))

```ruby
@full_name = "Yuki Nishijima"
first_name, last_name = full_name.split(" ")
# => NameError: undefined local variable or method `full_name' for main:Object
#
#     Did you mean? @full_name
#
```

#### Bug Fixes

- Fixed a bug where did\_you\_mean changes some behaviours of Ruby 2.1.3/2.1.4 installed on Max OS X ( [#14](https://github.com/yuki24/did_you_mean/issues/14 "Compatibility with `letter\_opener` gem"), [<tt>44c451f</tt>](https://github.com/yuki24/did_you_mean/commit/44c451f8c38b11763ba28ddf1ceb9696707ccea0), [<tt>9ebde21</tt>](https://github.com/yuki24/did_you_mean/commit/9ebde211e92eac8494e704f627c62fea7fdbee16))
- Fixed a bug where sometimes `NoMethodError` suggests duplicate method names ( [<tt>9865cc5</tt>](https://github.com/yuki24/did_you_mean/commit/9865cc5a9ce926dd9ad4c20d575b710e5f257a4b))

## [v0.8.0](https://github.com/yuki24/did_you_mean/tree/v0.8.0)

_<sup>released at 2014-10-27 02:03:13 UTC</sup>_

**This version has been yanked from rubygems.org as it has a serious bug with Ruby 2.1.3 and 2.1.4 installed on Max OS X. Please upgrade to 0.9.4 or higher as soon as possible.**

#### Features

- JRuby support!

#### Bug Fixes

- Fixed a bug where did\_you\_mean unexpectedly disables [better\_errors](https://github.com/charliesome/better_errors)'s REPL
- Replaced [binding\_of\_caller](https://github.com/banister/binding_of_caller) dependency with [interception](https://github.com/ConradIrwin/interception)
- Fixed the wrong implementation of Levenshtein algorithm ( [#2](https://github.com/yuki24/did_you_mean/pull/2 "Fix bug of DidYouMean::Levenshtein#min3."), [@fortissimo1997](https://github.com/fortissimo1997))

## [v0.7.0](https://github.com/yuki24/did_you_mean/tree/v0.7.0)

_<sup>released at 2014-09-26 03:37:18 UTC</sup>_

**This version has been yanked from rubygems.org as it has a serious bug with Ruby 2.1.3 and 2.1.4 installed on Max OS X. Please upgrade to 0.9.4 or higher as soon as possible.**

#### Features

- Added support for Ruby 2.1.3, 2.2.0-preview1 and ruby-head
- Added support for ActiveRecord 4.2.0.beta1
- Word searching is now about 40% faster than v0.6.0
- Removed `text` gem dependency
- Better output on pry and Rspec

#### Internal Changes

- A lot of internal refactoring

## [v0.6.0](https://github.com/yuki24/did_you_mean/tree/v0.6.0)

_<sup>released at 2014-05-18 00:23:24 UTC</sup>_

**This version has been yanked from rubygems.org as it has a serious bug with Ruby 2.1.3 and 2.1.4 installed on Max OS X. Please upgrade to 0.9.4 or higher as soon as possible.**

#### Features

- Added basic support for constants. Now you'll see class name suggestions when you misspelled a class names/module names:

```ruby
> Ocject
# => NameError: uninitialized constant Ocject
#
#     Did you mean? Object
#
```

#### Bug Fixes

- Fixed a bug where did\_you\_mean segfaults on Ruby head(2.2.0dev)

## [v0.5.0](https://github.com/yuki24/did_you_mean/tree/v0.5.0)

_<sup>released at 2014-05-10 17:59:54 UTC</sup>_

#### Features

- Added support for Ruby 2.1.2

## [v0.4.0](https://github.com/yuki24/did_you_mean/tree/v0.4.0)

_<sup>released at 2014-04-20 02:10:31 UTC</sup>_

#### Features

- did\_you\_mean now suggests a similar attribute name when you misspelled it.

```ruby
User.new(flrst_name: "wrong flrst name")
# => ActiveRecord::UnknownAttributeError: unknown attribute: flrst_name
#
#     Did you mean? first_name: string
#
```

#### Bug Fixes

- Fixed a bug where did\_you\_mean doesn't work with `ActiveRecord::UnknownAttributeError`

## [v0.3.1](https://github.com/yuki24/did_you_mean/tree/v0.3.1)

_<sup>released at 2014-03-20 23:16:20 UTC</sup>_

#### Features

- Changed output for readability.
- Made the spell checking algorithm slight better to find the correct method.

## [v0.3.0](https://github.com/yuki24/did_you_mean/tree/v0.3.0)

_<sup>released at 2014-03-20 23:13:13 UTC</sup>_

#### Features

- Added support for Ruby 2.1.1 and 2.2.0(head).

## [v0.2.0](https://github.com/yuki24/did_you_mean/tree/v0.2.0)

_<sup>released on 2014-03-20 23:12:13 UTC</sup>_

#### Features

- did\_you\_mean no longer makes Ruby slow.

#### Breaking Changes

- dropped support for JRuby and Rubbinious.

## [v0.1.0: First Release](https://github.com/yuki24/did_you_mean/tree/v0.1.0)

_<sup>released on 2014-03-20 23:11:14 UTC</sup>_

- Now you will have "did you mean?" experience in Ruby!
- but still very experimental since this gem makes Ruby a lot slower.
