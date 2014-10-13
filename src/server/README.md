# Backend Server For Kibana 4

This is the backend server for Kibana 4. It's written in Ruby using Sinatra and the Puma rack server. It's written to be compatible with JRuby and distributed as a jar file.

### Requirements

- Serve Static Files for Kibana
- Proxy requests to Elasticsearch
- Distributable an executable jar
- Platform for developing API endpoints for Kibana

### Configuration

Coming Soon...

### Project Layout
- **bin** - Where the kibana executable lives. This is the entry point for the Jar file
- **config** - Configuration files for warble, puma and the rack server
- **lib** - Where Kibana specific ruby libraries live
- **public** - This is where the static assets go
- **routes** - This is where the route controllers go
- **Gemfile** - This is the Gemfile for Bundler. Any dependencies need to be listed in here.
- **Gemfile.lock** - Bundler creates a lock file for the gem versions
- **Rakefile** - This is where the `rake` tasks go
- **README.md** - You're looking at it :D

### Development Environment Setup

#### JRuby

You'll need to have Java installed

Then, just run `grunt dev --use-jruby`

#### Ruby

Do the following to install and use ruby

- Install `rbenv`
  - Use `brew update; brew install rbenv ruby-build` on Mac
  - See [rbenv docs](https://github.com/sstephenson/rbenv#installation) otherwise
- Run `rbenv init` and add `eval "$(rbenv init -)"` to your .bashrc/.bash_profile
- Install ruby 1.9.3-p547 - `rbenv install 1.9.3-p547`
  - See [rbenv docs](https://github.com/sstephenson/rbenv#installing-ruby-versions) for help
- Run `ruby -v` and make sure you are using *1.9.3-p547*
  - If not, run `rbenv global 1.9.3-p547` and check again
- `gem install bundler`
- `cd src/server`
- `bundle`
- `cd ../..`
- `grunt dev`

In the future, the last line will be all you need

### Build Process

Coming Soon...

### Adding New Routes to the Project

Create a route class in `routes`

```ruby
require "rotues/base"

module Kibana
  module Routes
    class MyNewRoute < Base

      get '/my-route/' do
        json :something => 'fancy'
      end

    end
  end
end
```

Require the route in `lib/app` at the top of the file

```ruby
require "routes/home"
require "routes/api"
require "routes/my_new_route"

```

Now add the route to the class

```ruby
    # Rack middleware goes here
    use Rack::ReverseProxy do
      reverse_proxy /^\/elasticsearch(.*)$/, 'http://localhost:9200$1'
    end

    # Routes go here
    use Routes::Home
    use Routes::Api
    use Routes::MyNewRoute
  end
end

```
