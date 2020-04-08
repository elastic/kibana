# Ruby Atomic

[![Gem Version](https://badge.fury.io/rb/atomic.svg)](http://badge.fury.io/rb/atomic) [![Build Status](https://travis-ci.org/ruby-concurrency/atomic.svg?branch=master)](https://travis-ci.org/ruby-concurrency/atomic) [![Code Climate](https://codeclimate.com/github/ruby-concurrency/atomic.svg)](https://codeclimate.com/github/ruby-concurrency/atomic) [![Dependency Status](https://gemnasium.com/ruby-concurrency/atomic.svg)](https://gemnasium.com/ruby-concurrency/atomic) [![License](https://img.shields.io/badge/license-Apache-green.svg)](http://opensource.org/licenses/Apache-2.0) [![Gitter chat](http://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg)](https://gitter.im/ruby-concurrency/concurrent-ruby)

An atomic reference implementation for JRuby, Rubinius, and MRI.

# Deprecated!

*This gem has been deprecated in lieu of [Concurrent Ruby](http://www.concurrent-ruby.com).
This gem will be retained in GitHub and Rubygems.org indefinitely but no new development
will occur, including updates to support new versions of Ruby, JRuby, and Java. All users
of this gem are encouraged to update their projects to use `concurrent-ruby` instead.*

All code from this gem has been merged into `concurrent-ruby` and its companion gems.
All abstrations in this library are available in `concurrent-ruby` but have been moved
under the `Concurrent` module to avoid namespace collisions.

```ruby
# old way
require 'atomic'
my_atomic = Atomic.new(0)

# new way
require 'concurrent'
my_atomic = Concurrent::Atomic.new(0)
```

# Old Documentation

*For historic purposes only...*

## Summary

This library provides:

* an Atomic class that guarantees atomic updates to its contained value

The Atomic class provides accessors for the contained "value" plus two update methods:

* update will run the provided block, passing the current value and replacing it with the block result if the value has not been changed in the meantime. It may run the block repeatedly if there are other concurrent updates in progress.
* try_update will run the provided block, passing the current value and replacing it with the block result. If the value changes before the update can happen, it will throw an Atomic::ConcurrentUpdateError.

The atomic repository is at http://github.com/ruby-concurrency/ruby-atomic.

## Usage

The simplest way to use "atomic" is to call the "update" or "try_update" methods.

"try_update" and "update" both call the given block, passing the current value and using the block's result as the new value. If the value is updated by another thread before the block completes, "try update" raises a ConcurrentUpdateError and "update" retries the block. Because "update" may call the block several times when multiple threads are all updating the same value, the block's logic should be kept as simple as possible.

```ruby
require 'atomic'

my_atomic = Atomic.new(0)
my_atomic.update {|v| v + 1}
begin
  my_atomic.try_update {|v| v + 1}
rescue Atomic::ConcurrentUpdateError => cue
  # deal with it (retry, propagate, etc)
end
```

It's also possible to use the regular get/set operations on the Atomic, if you want to avoid the exception and respond to contended changes in some other way.

```ruby
my_atomic = Atomic.new(0)
my_atomic.value # => 0
my_atomic.value = 1
my_atomic.swap(2) # => 1
my_atomic.compare_and_swap(2, 3) # => true, updated to 3
my_atomic.compare_and_swap(2, 3) # => false, current is not 2
```

## Building

As of 1.1.0, JDK8 is required to build the atomic gem, since it attempts to use the new atomic Unsafe.getAndSetObject method only in JDK8. The resulting code should still work fine as far back as Java 5.
