# Snappy ![](https://travis-ci.org/miyucy/snappy.svg?branch=master)

see https://github.com/google/snappy

## Preparation

Use libsnappy

    $ brew install snappy

Or

    $ brew install autoconf automake libtool

## Installation

Add this line to your application's Gemfile:

    gem 'snappy'

And then execute:

    $ bundle

Or install it yourself as:

    $ gem install snappy

## Usage

```ruby
require 'snappy'

Snappy.deflate(source)
# => Compressed data

Snappy.inflate(source)
# => Decompressed data
```

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request
