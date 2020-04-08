# Net::Telnet

Provides telnet client functionality.

This class also has, through delegation, all the methods of a socket object (by default, a **TCPSocket**, but can be set by the **Proxy** option to ```new()```).  This provides methods such as ```close()``` to end the session and ```sysread()``` to read data directly from the host, instead of via the ```waitfor()``` mechanism.  Note that if you do use ```sysread()``` directly when in telnet mode, you should probably pass the output through ```preprocess()``` to extract telnet command sequences.

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'net-telnet'
```

And then execute:

    $ bundle

Or install it yourself as:

    $ gem install net-telnet

## Usage

### Log in and send a command, echoing all output to stdout

```ruby
localhost = Net::Telnet::new("Host" => "localhost",
                             "Timeout" => 10,
                             "Prompt" => /[$%#>] \z/n)
localhost.login("username", "password") { |c| print c }
localhost.cmd("command") { |c| print c }
localhost.close
```

### Check a POP server to see if you have mail

```ruby
pop = Net::Telnet::new("Host" => "your_destination_host_here",
                       "Port" => 110,
                       "Telnetmode" => false,
                       "Prompt" => /^\+OK/n)
pop.cmd("user " + "your_username_here") { |c| print c }
pop.cmd("pass " + "your_password_here") { |c| print c }
pop.cmd("list") { |c| print c }
```

## Development

After checking out the repo, run `bin/setup` to install dependencies. Then, run `bin/console` for an interactive prompt that will allow you to experiment.

To install this gem onto your local machine, run `bundle exec rake install`. To release a new version, update the version number in `version.rb`, and then run `bundle exec rake release` to create a git tag for the version, push git commits and tags, and push the `.gem` file to [rubygems.org](https://rubygems.org).

## Contributing

1. Fork it ( https://github.com/ruby/net-telnet/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
