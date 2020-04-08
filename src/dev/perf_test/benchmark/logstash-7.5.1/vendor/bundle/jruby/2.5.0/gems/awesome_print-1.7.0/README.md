## Awesome Print ##

[![RubyGems][gem_version_badge]][ruby_gems]
[![Travis CI][travis_ci_badge]][travis_ci]
[![Code Climate][code_climate_badge]][code_climate]
[![Code Climate Coverage][code_climate_coverage_badge]][code_climate]
[![RubyGems][gem_downloads_badge]][ruby_gems]
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/michaeldv/awesome_print?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


Awesome Print is a Ruby library that pretty prints Ruby objects in full color
exposing their internal structure with proper indentation. Rails ActiveRecord
objects and usage within Rails templates are supported via included mixins.

__NOTE__: awesome_print v1.2.0 is the last release supporting Ruby versions
prior to v1.9.3 and Rails versions prior to v3.0. The upcoming awesome_print
v2.0 will *require* Ruby v1.9.3 or later and Rails v3.0 or later.

### Installation ###
    # Installing as Ruby gem
    $ gem install awesome_print

    # Cloning the repository
    $ git clone git://github.com/michaeldv/awesome_print.git

### Usage ###

```ruby
require "awesome_print"
ap object, options = {}
```

Default options:

```ruby
:indent     => 4,      # Indent using 4 spaces.
:index      => true,   # Display array indices.
:html       => false,  # Use ANSI color codes rather than HTML.
:multiline  => true,   # Display in multiple lines.
:plain      => false,  # Use colors.
:raw        => false,  # Do not recursively format object instance variables.
:sort_keys  => false,  # Do not sort hash keys.
:limit      => false,  # Limit large output for arrays and hashes. Set to a boolean or integer.
:color => {
  :args       => :pale,
  :array      => :white,
  :bigdecimal => :blue,
  :class      => :yellow,
  :date       => :greenish,
  :falseclass => :red,
  :fixnum     => :blue,
  :float      => :blue,
  :hash       => :pale,
  :keyword    => :cyan,
  :method     => :purpleish,
  :nilclass   => :red,
  :rational   => :blue,
  :string     => :yellowish,
  :struct     => :pale,
  :symbol     => :cyanish,
  :time       => :greenish,
  :trueclass  => :green,
  :variable   => :cyanish
}
```

Supported color names:

```ruby
:gray, :red, :green, :yellow, :blue, :purple, :cyan, :white
:black, :redish, :greenish, :yellowish, :blueish, :purpleish, :cyanish, :pale
```

Use `Object#ai` to return an ASCII encoded string:

```ruby
irb> "awesome print".ai
=> "\e[0;33m\"awesome print\"\e[0m"
```

### Examples ###

```ruby
$ cat > 1.rb
require "awesome_print"
data = [ false, 42, %w(forty two), { :now => Time.now, :class => Time.now.class, :distance => 42e42 } ]
ap data
^D
$ ruby 1.rb
[
    [0] false,
    [1] 42,
    [2] [
        [0] "forty",
        [1] "two"
    ],
    [3] {
           :class => Time < Object,
             :now => Fri Apr 02 19:55:53 -0700 2010,
        :distance => 4.2e+43
    }
]

$ cat > 2.rb
require "awesome_print"
data = { :now => Time.now, :class => Time.now.class, :distance => 42e42 }
ap data, :indent => -2  # <-- Left align hash keys.
^D
$ ruby 2.rb
{
  :class    => Time < Object,
  :now      => Fri Apr 02 19:55:53 -0700 2010,
  :distance => 4.2e+43
}

$ cat > 3.rb
require "awesome_print"
data = [ false, 42, %w(forty two) ]
data << data  # <-- Nested array.
ap data, :multiline => false
^D
$ ruby 3.rb
[ false, 42, [ "forty", "two" ], [...] ]

$ cat > 4.rb
require "awesome_print"
class Hello
  def self.world(x, y, z = nil, &blk)
  end
end
ap Hello.methods - Class.methods
^D
$ ruby 4.rb
[
    [0] world(x, y, *z, &blk) Hello
]

$ cat > 5.rb
require "awesome_print"
ap (''.methods - Object.methods).grep(/!/)
^D
$ ruby 5.rb
[
    [ 0] capitalize!()           String
    [ 1]      chomp!(*arg1)      String
    [ 2]       chop!()           String
    [ 3]     delete!(*arg1)      String
    [ 4]   downcase!()           String
    [ 5]     encode!(*arg1)      String
    [ 6]       gsub!(*arg1)      String
    [ 7]     lstrip!()           String
    [ 8]       next!()           String
    [ 9]    reverse!()           String
    [10]     rstrip!()           String
    [11]      slice!(*arg1)      String
    [12]    squeeze!(*arg1)      String
    [13]      strip!()           String
    [14]        sub!(*arg1)      String
    [15]       succ!()           String
    [16]   swapcase!()           String
    [17]         tr!(arg1, arg2) String
    [18]       tr_s!(arg1, arg2) String
    [19]     upcase!()           String
]

$ cat > 6.rb
require "awesome_print"
ap 42 == ap(42)
^D
$ ruby 6.rb
42
true
$ cat 7.rb
require "awesome_print"
some_array = (1..1000).to_a
ap some_array, :limit => true
^D
$ ruby 7.rb
[
    [  0] 1,
    [  1] 2,
    [  2] 3,
    [  3] .. [996],
    [997] 998,
    [998] 999,
    [999] 1000
]

$ cat 8.rb
require "awesome_print"
some_array = (1..1000).to_a
ap some_array, :limit => 5
^D
$ ruby 8.rb
[
    [  0] 1,
    [  1] 2,
    [  2] .. [997],
    [998] 999,
    [999] 1000
]
```

### Example (Rails console) ###
```ruby
$ rails console
rails> require "awesome_print"
rails> ap Account.limit(2).all
[
    [0] #<Account:0x1033220b8> {
                     :id => 1,
                :user_id => 5,
            :assigned_to => 7,
                   :name => "Hayes-DuBuque",
                 :access => "Public",
                :website => "http://www.hayesdubuque.com",
        :toll_free_phone => "1-800-932-6571",
                  :phone => "(111)549-5002",
                    :fax => "(349)415-2266",
             :deleted_at => nil,
             :created_at => Sat, 06 Mar 2010 09:46:10 UTC +00:00,
             :updated_at => Sat, 06 Mar 2010 16:33:10 UTC +00:00,
                  :email => "info@hayesdubuque.com",
        :background_info => nil
    },
    [1] #<Account:0x103321ff0> {
                     :id => 2,
                :user_id => 4,
            :assigned_to => 4,
                   :name => "Ziemann-Streich",
                 :access => "Public",
                :website => "http://www.ziemannstreich.com",
        :toll_free_phone => "1-800-871-0619",
                  :phone => "(042)056-1534",
                    :fax => "(106)017-8792",
             :deleted_at => nil,
             :created_at => Tue, 09 Feb 2010 13:32:10 UTC +00:00,
             :updated_at => Tue, 09 Feb 2010 20:05:01 UTC +00:00,
                  :email => "info@ziemannstreich.com",
        :background_info => nil
    }
]
rails> ap Account
class Account < ActiveRecord::Base {
                 :id => :integer,
            :user_id => :integer,
        :assigned_to => :integer,
               :name => :string,
             :access => :string,
            :website => :string,
    :toll_free_phone => :string,
              :phone => :string,
                :fax => :string,
         :deleted_at => :datetime,
         :created_at => :datetime,
         :updated_at => :datetime,
              :email => :string,
    :background_info => :string
}
rails>
```

### IRB integration ###
To use awesome_print as default formatter in irb and Rails console add the following
code to your ~/.irbrc file:

```ruby
require "awesome_print"
AwesomePrint.irb!
```

### PRY integration ###
If you miss awesome_print's way of formatting output, here's how you can use it in place
of the formatting which comes with pry. Add the following code to your ~/.pryrc:

```ruby
require "awesome_print"
AwesomePrint.pry!
```

### Logger Convenience Method ###
awesome_print adds the 'ap' method to the Logger and ActiveSupport::BufferedLogger classes
letting you call:

    logger.ap object

By default, this logs at the :debug level. You can override that globally with:

    :log_level => :info

in the custom defaults (see below). You can also override on a per call basis with:

    logger.ap object, :warn

### ActionView Convenience Method ###
awesome_print adds the 'ap' method to the ActionView::Base class making it available
within Rails templates. For example:

    <%= ap @accounts.first %>   # ERB
    != ap @accounts.first       # HAML

With other web frameworks (ex: in Sinatra templates) you can explicitly request HTML
formatting:

    <%= ap @accounts.first, :html => true %>

### Setting Custom Defaults ###
You can set your own default options by creating ``.aprc`` file in your home
directory. Within that file assign your  defaults to ``AwesomePrint.defaults``.
For example:

```ruby
# ~/.aprc file.
AwesomePrint.defaults = {
  :indent => -2,
  :color => {
    :hash  => :pale,
    :class => :white
  }
}
```

## Versioning

AwesomePrint follows the [Semantic Versioning](http://semver.org/) standard.

### Contributing ###
See [Contributing.md](https://github.com/michaeldv/awesome_print/blob/master/CONTRIBUTING.md)
 for information.

### License ###
Copyright (c) 2010-2013 Michael Dvorkin

http://www.dvorkin.net

%w(mike dvorkin.net) * "@" || "twitter.com/mid"

Released under the MIT license. See LICENSE file for details.

[gem_version_badge]: https://img.shields.io/gem/v/awesome_print.svg?style=flat
[gem_downloads_badge]: http://img.shields.io/gem/dt/awesome_print.svg?style=flat
[ruby_gems]: http://rubygems.org/gems/awesome_print
[travis_ci]: http://travis-ci.org/michaeldv/awesome_print
[travis_ci_badge]: https://img.shields.io/travis/michaeldv/awesome_print/master.svg?style=flat
[code_climate]: https://codeclimate.com/github/michaeldv/awesome_print
[code_climate_badge]: http://img.shields.io/codeclimate/github/michaeldv/awesome_print.svg?style=flat
[code_climate_coverage_badge]: https://codeclimate.com/github/michaeldv/awesome_print/badges/coverage.svg
