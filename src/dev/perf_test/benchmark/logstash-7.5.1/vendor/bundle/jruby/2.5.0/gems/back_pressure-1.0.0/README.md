# BackPressure

The `back_pressure` gem provides a small set of tools for providing back-pressure in Ruby.

This project is designed to be zero-dependency and API-stable at `1.x`, making it a safe dependency that will not lead to transitive-dependency conflicts.

It is licensed under the [Apache License, Version 2.0](./LICENSE-APACHE2.md), which grants you the freedom to use and modify it and limits the liability of the contributors.

## Status
 - [![Build Status](https://travis-ci.org/yaauie/ruby_back_pressure.svg?branch=master)](https://travis-ci.org/yaauie/ruby_back_pressure)
 - [![Apache License](https://img.shields.io/badge/license-Apache%202-green.svg)](https://www.rubydoc.info/github/yaauie/ruby_back_pressure/master)
 - ![API: Stable](https://img.shields.io/badge/API-stable-green.svg)
 - ![Runtime Dependencies: Zero](https://img.shields.io/badge/runtime%20dependencies-0-green.svg)


## Installation

### Using Bundler

Either this line to your application's Gemfile:

~~~ruby
gem 'back_pressure', '~> 1.0'
~~~

Or to your library project's `gemspec`:

~~~ruby
  spec.add_runtime_dependency 'back_pressure', '~> 1.0`
~~~

And then execute:

    $ bundle

### Manual Installation

This gem can be installed manually with the `gem install` command:

    $ gem install back_pressure

## Usage

### `BackPressure::Executor`

Implementations of `BackPressure::Executor` provide a way to execute a block of code once it is safe to do so.

#### Example: `BackPressure::GatedExecutor`

Suppose we have a non-blocking API client that will fire hooks when its underlying connection is blocked (e.g., on a two-way stream when the receiver indicates that it is temporarily unable or unwilling to read from the stream).
Continuing to push data to a non-blocking API in this state is dangerous, because if the connection is lost we are liable to lose data.
We can use a `GatedExecutor` to ensure that we propagate the blockage to the code that is attempting to push to the non-blocking API client:

~~~ruby
gated_executor = BackPressure::GatedExecutor.new

non_blocking_api_client.on_connection_blocked   { gated_executor.engage_back_pressure }
non_blocking_api_client.on_connection_unblocked { gated_executor.remove_back_pressure }

16.times do
  Thread.new do
    loop do
      message = queue.pop
      gated_executor.execute { non_blocking_api_client.push(message) }
    end
  end
end
~~~

## Development

After checking out the repo, run `bin/setup` to install dependencies. Then, run `rake spec` to run the tests. You can also run `bin/console` for an interactive prompt that will allow you to experiment.

To install this gem onto your local machine, run `bundle exec rake install`. To release a new version, update the version number in `version.rb`, and then run `bundle exec rake release`, which will create a git tag for the version, push git commits and tags, and push the `.gem` file to [rubygems.org](https://rubygems.org).

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/yaauie/ruby_back_pressure.
This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.

### Project Priorities

Contributions to this project will be assessed by the following priorities, _in order_.

0. **Zero Breaking Changes**: This project is designed to be API-stable, enabling users to add it as a dependency of their own projects without risk of introducing transitive-dependency conflicts. If a change is desired that cannot be implemented within the existing promises made, it _MUST_ be implemented distinctly and separately.
1. **Zero Runtime Dependencies**: In order to eliminate transitive-dependency conflicts, contributions _MUST NOT_ introduce runtime dependencies.
2. **Zero Mutation**: Tools in this project _MUST NOT_ mutate any objects that they do not explicitly own.
3. **Clarity and Validation of Promises Made**: In order to ensure future development doesn't accidentally break real-world usage, contributions _MUST_ clearly and explicitly document and verify the promises they make.
4. **Ease of Use**: In order to ensure that users can safely consume the tools provided by this gem, usage patterns _SHOULD_ be clear and concise.
5. **Composable Components over Complete Solutions**: In order to provide API-stability, tools _SHOULD_ be implemented in their simplest possible form.

### Versioning

This project follows the [Semantic Versioning](https://semver.org/spec/v2.0.0.html) standard, and is API-stable at `1.x`:
 - MAJOR: will always be 1.x, since this project is API-stable by design.
 - MINOR: new backward-compatible features and abstractions will be available in minor releases.
 - PATCH: fixes to existing features will be made available in patch-level releases.

## Code of Conduct

Everyone interacting in the BackPressure project’s codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/[USERNAME]/back_pressure/blob/master/CODE_OF_CONDUCT.md).
