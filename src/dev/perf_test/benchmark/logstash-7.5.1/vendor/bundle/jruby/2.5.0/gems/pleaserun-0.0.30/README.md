# Please, Run!

Pleaserun is a tool to generate startup scripts for the wasteland of sorrow
that is process launchers.

Ideally, you should be able to specify a configuration of how to run a given
service command (like apache, syslog-ng, whatever), and this tool should
be able to spit out a script or config file for your target platform.

## What's going on here?

With pleaserun, you can generate the following launchers/scripts/whatever:

* launchd
* upstart
* systemd
* runit
* sysv init

Want more? It's easy to add things. [File an issue](../../issues/) and ask away!

## Installation

    gem install pleaserun

## Your First Process

First, we need a program to run!

### Example: redis

For no particular reason, this example will choose redis to run. The idea is to
simulate the same workflow you would normally go through in production: acquire
software, deploy it, run it. Pleaserun helps you with the 'run it' part, but
first let's get redis and build it.

    wget http://download.redis.io/releases/redis-2.8.6.tar.gz
    tar -zxf redis-2.8.6.tar.gz
    cd redis-2.8.6
    make -j4
    make install PREFIX=/tmp/redis

Assuming the above succeeds (it did for me!), we now have redis installed to `/tmp/redis`:

    % ls /tmp/redis/bin
    redis-benchmark redis-check-aof redis-check-dump redis-cli redis-server

You might be thinking - why /tmp? This is just a demo! That's why! :)

### Generate a runner

What platform are you on? Do you know the best way to run a server process? I
can never remember.

Luckily, pleaserun remembers.

    # Run as root so pleaserun has permissions to write to
    # any files required to install this as a service!
    % sudo pleaserun --install /tmp/redis/bin/redis-server
    No platform selected. Autodetecting... {:platform=>"upstart", :version=>"1.5", :level=>:warn}
    No name given, setting reasonable default {:name=>"redis-server", :level=>:warn}
    Writing file {:destination=>"/etc/init/redis-server.conf"}
    Writing file {:destination=>"/etc/init.d/redis-server"}

Note: The `--install` flag above tells pleaserun to install it on this current system. The
default behavior without this flag is to install it in a temp directory so you can copy
it elsewhere if desired.

Now what? You can see above it automatically detected that "Upstart 1.5" was
the right process runner to target. Let's try using it!

    % status redis-server
    redis-server stop/waiting

    % sudo start redis-server
    redis-server start/running, process 395

    % status redis-server
    redis-server start/running, process 395

    % ps -fwwp 395
    UID        PID  PPID  C STIME TTY          TIME CMD
    root       395     1  0 06:27 ?        00:00:00 /tmp/redis/bin/redis-server *:6379

    # Is it running? Let's check with redis-cli
    % redis-cli
    127.0.0.1:6379> ping
    PONG

    % sudo stop redis-server
    redis-server stop/waiting

Bam. Pretty easy, right? Let's recap!

### Recap

* You ran `pleaserun --install /tmp/redis/bin/redis-server`
* Pleaserun detected the platform as Upstart 1.5
* You didn't have to write an init script.
* You didn't have to know how to write an Upstart config.

### Overview

See `pleaserun --help` for a list of flags. Basics:

* `-p` lets you set the platform to target. If not specified, this is
  automatically detected based on your current system/environment.
* `-v` lets you set the version of the platform to target. Useful in cases
  where things like Upstart 0.6.5 differ wildly in configuration from Upstart
  1.5
* `--name` the name of the process. This shows up as
  /etc/init.d/the-name-you-give for sysv, or the name you use to reference the
  service with upstart, systemd, or launchd, etc!
* `--prestart` lets you run a command *before* starting the main program. This
  can be used to do config or validation checks before you start a program. If
  the prestart exits nonzero, the start of the process will be aborted.

A silly example:

    # Generate a LSB 3.1-compliant SYSV-style init script
    % pleaserun --install -p sysv -v lsb-3.1 --name sleeper /bin/sleep 60
    Writing file {:destination=>"/etc/init.d/sleeper"}
    Writing file {:destination=>"/etc/default/sleeper"}

    # Try it!
    % /etc/init.d/sleeper status          
    sleeper is not running

    % sudo /etc/init.d/sleeper start
    sleeper started.

    % ps -fwp $(cat /var/run/sleeper.pid)
    UID        PID  PPID  C STIME TTY          TIME CMD
    root     50473     1  0 22:36 pts/7    00:00:00 /bin/sleep 60

# Hacking

If you want to work on pleaserun, here's what you need to do:

1. Get a decent version of Ruby.  [rvm](https://rvm.io/) is good for this.
2. Install bundler: `gem install bundler`
3. Install dependencies: `bundle install`
4. Make your changes!
5. Run tests: `bundle exec rspec`
6. Make a pull request!

# One last thing!

Please enjoy running things! If you are not enjoying this program, then something is wrong, and we can fix it together :)

If you are having a bad time, it is a bug!

All contributions welcome (bug reports, feature requests, bug fixes, new features, etc!)
