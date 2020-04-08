# Puma: A Ruby Web Server Built For Concurrency

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/puma/puma?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) [![Build Status](https://secure.travis-ci.org/puma/puma.png)](http://travis-ci.org/puma/puma) [![Dependency Status](https://gemnasium.com/puma/puma.png)](https://gemnasium.com/puma/puma) <a href="https://codeclimate.com/github/puma/puma"><img src="https://codeclimate.com/github/puma/puma.png" /></a>

## Description

Puma is a simple, fast, threaded, and highly concurrent HTTP 1.1 server for Ruby/Rack applications. Puma is intended for use in both development and production environments. In order to get the best throughput, it is highly recommended that you use a  Ruby implementation with real threads like Rubinius or JRuby.

## Built For Speed &amp; Concurrency

Puma is a simple, fast, and highly concurrent HTTP 1.1 server for Ruby web applications. It can be used with any application that supports Rack, and is considered the replacement for Webrick and Mongrel. It was designed to be the go-to server for [Rubinius](http://rubini.us), but also works well with JRuby and MRI. Puma is intended for use in both development and production environments.

Under the hood, Puma processes requests using a C-optimized Ragel extension (inherited from Mongrel) that provides fast, accurate HTTP 1.1 protocol parsing in a portable way. Puma then serves the request in a thread from an internal thread pool (which you can control). This allows Puma to provide real concurrency for your web application!

With Rubinius 2.0, Puma will utilize all cores on your CPU with real threads, meaning you won't have to spawn multiple processes to increase throughput. You can expect to see a similar benefit from JRuby.

On MRI, there is a Global Interpreter Lock (GIL) that ensures only one thread can be run at a time. But if you're doing a lot of blocking IO (such as HTTP calls to external APIs like Twitter), Puma still improves MRI's throughput by allowing blocking IO to be run concurrently (EventMachine-based servers such as Thin turn off this ability, requiring you to use special libraries). Your mileage may vary. In order to get the best throughput, it is highly recommended that you use a Ruby implementation with real threads like [Rubinius](http://rubini.us) or [JRuby](http://jruby.org).

## Quick Start

The easiest way to get started with Puma is to install it via RubyGems. You can do this easily:

    $ gem install puma

Now you should have the `puma` command available in your PATH, so just do the following in the root folder of your Rack application:

    $ puma app.ru

## Advanced Setup

### Sinatra

You can run your Sinatra application with Puma from the command line like this:

    $ ruby app.rb -s Puma

Or you can configure your application to always use Puma:

    require 'sinatra'
    configure { set :server, :puma }

If you use Bundler, make sure you add Puma to your Gemfile (see below).

### Rails

First, make sure Puma is in your Gemfile:

    gem 'puma'

Then start your server with the `rails` command:

    $ rails s Puma

### Rackup

You can pass it as an option to `rackup`:

    $ rackup -s Puma

Alternatively, you can modify your `config.ru` to choose Puma by default, by adding the following as the first line:

    #\ -s puma

## Configuration

Puma provides numerous options for controlling the operation of the server. Consult `puma -h` (or `puma --help`) for a full list.

### Thread Pool

Puma utilizes a dynamic thread pool which you can modify. You can set the minimum and maximum number of threads that are available in the pool with the `-t` (or `--threads`) flag:

    $ puma -t 8:32

Puma will automatically scale the number of threads based on how much traffic is present. The current default is `0:16`. Feel free to experiment, but be careful not to set the number of maximum threads to a very large number, as you may exhaust resources on the system (or hit resource limits).

### Clustered mode

Puma 2 offers clustered mode, allowing you to use forked processes to handle multiple incoming requests concurrently, in addition to threads already provided. You can tune the number of workers with the `-w` (or `--workers`) flag:

    $ puma -t 8:32 -w 3

On a ruby implementation that offers native threads, you should tune this number to match the number of cores available.
Note that threads are still used in clustered mode, and the `-t` thread flag setting is per worker, so `-w 2 -t 16:16` will be 32 threads.

If you're running in Clustered Mode you can optionally choose to preload your application before starting up the workers. This is necessary in order to take advantage of the [Copy on Write](http://en.wikipedia.org/wiki/Copy-on-write) feature introduced in [MRI Ruby 2.0](https://blog.heroku.com/archives/2013/3/6/matz_highlights_ruby_2_0_at_waza). To do this simply specify the `--preload` flag in invocation:

    # CLI invocation
    $ puma -t 8:32 -w 3 --preload

If you're using a configuration file, use the `preload_app!` method, and be sure to specify your config file's location with the `-C` flag:

    $ puma -C config/puma.rb

    # config/puma.rb
    threads 8,32
    workers 3
    preload_app!

Additionally, you can specify a block in your configuration file that will be run on boot of each worker:

    # config/puma.rb
    on_worker_boot do
      # configuration here
    end

This code can be used to setup the process before booting the application, allowing
you to do some Puma-specific things that you don't want to embed in your application.
For instance, you could fire a log notification that a worker booted or send something to statsd.
This can be called multiple times to add hooks.

If you're preloading your application and using ActiveRecord, it's recommend you setup your connection pool here:

    # config/puma.rb
    on_worker_boot do
      ActiveSupport.on_load(:active_record) do
        ActiveRecord::Base.establish_connection
      end
    end

On top of that, you can specify a block in your configuration file that will be run before workers are forked

    # config/puma.rb
    before_fork do
      # configuration here
    end

This code can be used to clean up before forking to clients, allowing
you to do some Puma-specific things that you don't want to embed in your application.

If you're preloading your application and using ActiveRecord, it's recommend you close any connections to the database here to prevent connection leakage:

    # config/puma.rb
    before_fork do
      ActiveRecord::Base.connection_pool.disconnect!
    end

This rule applies to any connections to external services (Redis, databases, memcache, ...) that might be started automatically by the framework.

When you use preload_app, your new code goes all in the master process, and is then copied in the workers (meaning it’s only compatible with cluster mode). General rule is to use preload_app when your workers die often and need fast starts. If you don’t have many workers, you probably should not use preload_app.

Note that preload_app can’t be used with phased restart, since phased restart kills and restarts workers one-by-one, and preload_app is all about copying the code of master into the workers.

### Error handler for low-level errors

If puma encounters an error outside of the context of your application, it will respond with a 500 and a simple
textual error message (see `lowlevel_error` in [this file](https://github.com/puma/puma/blob/master/lib/puma/server.rb)).
You can specify custom behavior for this scenario. For example, you can report the error to your third-party
error-tracking service (in this example, [rollbar](http://rollbar.com)):

```ruby
lowlevel_error_handler do |e|
  Rollbar.critical(e)
  [500, {}, ["An error has occurred, and engineers have been informed. Please reload the page. If you continue to have problems, contact support@example.com\n"]]
end
```

### Binding TCP / Sockets

In contrast to many other server configs which require multiple flags, Puma simply uses one URI parameter with the `-b` (or `--bind`) flag:

    $ puma -b tcp://127.0.0.1:9292

Want to use UNIX Sockets instead of TCP (which can provide a 5-10% performance boost)? No problem!

    $ puma -b unix:///var/run/puma.sock

If you need to change the permissions of the UNIX socket, just add a umask parameter:

    $ puma -b 'unix:///var/run/puma.sock?umask=0111'

Need a bit of security? Use SSL sockets!

    $ puma -b 'ssl://127.0.0.1:9292?key=path_to_key&cert=path_to_cert'

### Control/Status Server

Puma comes with a builtin status/control app that can be used query and control Puma itself. Here is an example of starting Puma with the control server:

    $ puma --control tcp://127.0.0.1:9293 --control-token foo

This directs Puma to start the control server on localhost port 9293. Additionally, all requests to the control server will need to include `token=foo` as a query parameter. This allows for simple authentication. Check out [status.rb](https://github.com/puma/puma/blob/master/lib/puma/app/status.rb) to see what the app has available.

### Configuration file

You can also provide a configuration file which Puma will use with the `-C` (or `--config`) flag:

    $ puma -C /path/to/config

By default, if no configuration file is specified, Puma will look for a configuration file at config/puma.rb. If an environment is specified, either via the `-e` and `--environment` flags, or through the `RACK_ENV` environment variable, the default file location will be config/puma/environment_name.rb.

If you want to prevent Puma from looking for a configuration file in those locations, provide a dash as the argument to the `-C` (or `--config`) flag:

    $ puma -C "-"

Take the following [sample configuration](https://github.com/puma/puma/blob/master/examples/config.rb) as inspiration or check out [configuration.rb](https://github.com/puma/puma/blob/master/lib/puma/configuration.rb) to see all available options.

## Restart

Puma includes the ability to restart itself allowing easy upgrades to new versions. When available (MRI, Rubinius, JRuby), Puma performs a "hot restart". This is the same functionality available in *unicorn* and *nginx* which keep the server sockets open between restarts. This makes sure that no pending requests are dropped while the restart is taking place.

To perform a restart, there are 2 builtin mechanisms:

  * Send the `puma` process the `SIGUSR2` signal
  * Use the status server and issue `/restart`

No code is shared between the current and restarted process, so it should be safe to issue a restart any place where you would manually stop Puma and start it again.

If the new process is unable to load, it will simply exit. You should therefore run Puma under a supervisor when using it in production.

### Normal vs Hot vs Phased Restart

A hot restart means that no requests while deploying your new code will be lost, since the server socket is kept open between restarts.

But beware, hot restart does not mean that the incoming requests won’t hang for multiple seconds while your new code has not fully deployed. If you need a zero downtime and zero hanging requests deploy, you must use phased restart.

When you run pumactl phased-restart, Puma kills workers one-by-one, meaning that at least another worker is still available to serve requests, which lead in zero hanging request (yay!).

But again beware, upgrading an application sometimes involves upgrading the database schema. With phased restart, there may be a moment during the deployment where processes belonging to the previous version and processes belonging to the new version both exist at the same time. Any database schema upgrades you perform must therefore be backwards-compatible with the old application version.

if you perform a lot of database migrations, you probably should not use phased restart and use a normal/hot restart instead (pumactl restart). That way, no code is shared while deploying (in that case, preload_app might help for quicker deployment, see below).


### Cleanup Code

Puma isn't able to understand all the resources that your app may use, so it provides a hook in the configuration file you pass to `-C` called `on_restart`. The block passed to `on_restart` will be called, unsurprisingly, just before Puma restarts itself.

You should place code to close global log files, redis connections, etc in this block so that their file descriptors don't leak into the restarted process. Failure to do so will result in slowly running out of descriptors and eventually obscure crashes as the server is restart many times.

### Platform Constraints

Because of various platforms not being implement certain things, the following differences occur when Puma is used on different platforms:

  * **JRuby**, **Windows**: server sockets are not seamless on restart, they must be closed and reopened. These platforms have no way to pass descriptors into a new process that is exposed to ruby
  * **JRuby**, **Windows**: cluster mode is not supported due to a lack of  fork(2)
  * **Windows**: daemon mode is not supported due to a lack of fork(2)

## pumactl

`pumactl` is a simple CLI frontend to the control/status app described above.  Please refer to `pumactl --help` for available commands.

## Managing multiple Pumas / init.d / upstart scripts

If you want an easy way to manage multiple scripts at once check [tools/jungle](https://github.com/puma/puma/tree/master/tools/jungle) for init.d and upstart scripts.

## Capistrano deployment

Puma has support for Capistrano3 with an [external gem](https://github.com/seuros/capistrano-puma), you just need require that in Gemfile:

```ruby
gem 'capistrano3-puma'
```
And then execute:

```bash
bundle
```

Then add to Capfile

```ruby
require 'capistrano/puma'
```

and then

```bash
$ bundle exec cap puma:start
$ bundle exec cap puma:restart
$ bundle exec cap puma:stop
$ bundle exec cap puma:phased-restart
```

## Contributing

To run the test suite:

```bash
$ bundle install
$ bundle exec rake
```

## License

Puma is copyright 2014 Evan Phoenix and contributors. It is licensed under the BSD 3-Clause license. See the include LICENSE file for details.
