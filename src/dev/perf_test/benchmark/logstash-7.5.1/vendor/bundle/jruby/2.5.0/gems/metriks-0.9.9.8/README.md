# Metriks Client

This is an experiment in making a threadsafe, low impact library to measure
aspects of your ruby.

The library is very much a work-in-progress. It is being developed as
I find needs while developing [Papertrail](https://papertrailapp.com/).


# Installing

The API is still in flux, but you can add this to your project by installing
the gem.

To install, add this to your `Gemfile`:

``` ruby
gem 'metriks'
```

and re-run `bundle`.


# Metric API Overview

## Counters

Basic atomic counter. Used as an underlying metric for many of the other
more advanced metrics.


### increment(incr = 1)

Increment the counter. Without an argument it will increment by `1`.

``` ruby
  counter = Metriks.counter('calls')
  counter.increment
```

### decrement(decr = 1)

Decrement the counter. Without an argument it will decrement by `1`.

``` ruby
  counter = Metriks.counter('calls')
  counter.decrement
```

#### count()

Return the current value of the counter.

``` ruby
  counter = Metriks.counter('calls')
  puts "counter: #{counter.count}"
```

## Gauges

A gauge is an instantaneous measurement of a value.

It takes a callback to measure the value in form of a block or a callable
object.

**WARNING:** The code in the callback is executed every time the `#value`
method is called on the gauge. Most of the time this will be done by a
metriks reporter that is running in a separate thread.

``` ruby
  # Callback as block
  gauge = Metriks.gauge('queue.size') { queue.size }

  # Callback as object responding to #call
  callable = proc { queue.size }
  gauge = Metriks.gauge('queue.size', callable)
```

### set(val)

Set the current value.

``` ruby
  gauge = Metriks.gauge('queue_size')
  gauge.set(queue.size)
```

### value()

Returns the value returned by the callback (if one is defined), returns the
value set via `#set` (or the default of 0) otherwise.

``` ruby
  gauge = Metriks.gauge('queue_size')
  puts "queue size: #{gauge.value}"
```

## Meters

A meter that measures the mean throughput and the one-, five-, and
fifteen-minute exponentially-weighted moving average throughputs.

### mark(val = 1)

Record an event with the meter. Without an argument it will record one event.

``` ruby
  meter = Metriks.meter('requests')
  meter.mark
```

### count()

Returns the total number of events that have been recorded.

``` ruby
  meter = Metriks.meter('requests')
  puts "total: #{meter.count}"
```

### one_minute_rate()

Returns the one-minute average rate.

``` ruby
  meter = Metriks.meter('requests')
  puts "rate: #{meter.one_minute_rate}/sec"
```

### five_minute_rate()

Returns the five-minute average rate.

``` ruby
  meter = Metriks.meter('requests')
  puts "rate: #{meter.five_minute_rate}/sec"
```

### fifteen_minute_rate()

Returns the fifteen-minute average rate.

``` ruby
  meter = Metriks.meter('requests')
  puts "rate: #{meter.fifteen_minute_rate}/sec"
```

### mean_rate()

Returns the mean (average) rate of the events since the start of the process.

``` ruby
  meter = Metriks.meter('requests')
  puts "rate: #{meter.mean_rate}/sec"
```

## Timers

A timer that measures the average time as well as throughput metrics via
a meter.

### update(duration)

Records the duration of an operation. This normally wouldn't need to be
called — the `#time` method is provided to simplify recording a duration.

``` ruby
  timer = Metriks.timer('requests')
  t0 = Time.now
  work
  timer.update(Time.now - t0)
```

### time(callable = nil, &block)

Measure the amount of time a proc takes to execute. Takes either a block
or an object responding to `#call` (normally a `proc` or `lambda`).

``` ruby
  timer = Metriks.timer('requests')
  work_result = timer.time do
    work
  end
```

If neither a block or an object is passed to the method, an object that
responds to `#stop` will be returned. When `#stop` is called, the time
will be recorded.

``` ruby
  timer = Metriks.timer('requests')
  t = timer.time
  work
  t.stop
```

### count()

Returns the number of measurements that have been made.

``` ruby
  timer = Metriks.timer('requests')
  puts "calls: #{timer.count}"
```

### one_minute_rate()

Returns the one-minute average rate.

``` ruby
  meter = Metriks.timer('requests')
  puts "rate: #{meter.one_minute_rate}/sec"
```

### five_minute_rate()

Returns the five-minute average rate.

``` ruby
  meter = Metriks.timer('requests')
  puts "rate: #{meter.five_minute_rate}/sec"
```

### fifteen_minute_rate()

Returns the fifteen-minute average rate.

``` ruby
  meter = Metriks.timer('requests')
  puts "rate: #{meter.fifteen_minute_rate}/sec"
```

### mean_rate()

Returns the mean (average) rate of the events since the start of the process.

``` ruby
  meter = Metriks.timer('requests')
  puts "rate: #{meter.mean_rate}/sec"
```

### min()

Returns the minimum amount of time spent in the operation.

``` ruby
  meter = Metriks.timer('requests')
  puts "time: #{meter.min} seconds"
```

### max()

Returns the maximum time spent in the operation.

``` ruby
  meter = Metriks.timer('requests')
  puts "time: #{meter.max} seconds"
```

### mean()

Returns the mean (average) time spent in the operation.

``` ruby
  meter = Metriks.timer('requests')
  puts "time: #{meter.mean} seconds"
```

### stddev()

Returns the standard deviation of the mean spent in the operation.

``` ruby
  meter = Metriks.timer('requests')
  puts "time: #{meter.stddev} seconds"
```


## Utilization Timer

A specialized `Timer` that calculates the percentage (between `0.0` and `1.0`) of
wall-clock time that was spent. It includes all of the methods of `Timer`.


### one_minute_utilization()

Returns the one-minute average utilization as a percentage between `0.0` and `1.0`.

``` ruby
  meter = Metriks.utilization_timer('requests')
  puts "utilization: #{meter.one_minute_utilization * 100}%"
```

### five_minute_utilization()

Returns the five-minute average utilization as a percentage between `0.0` and `1.0`.

``` ruby
  meter = Metriks.utilization_timer('requests')
  puts "utilization: #{meter.five_minute_utilization * 100}%"
```

### fifteen_minute_utilization()

Returns the fifteen-minute average utilization as a percentage between `0.0` and `1.0`.

``` ruby
  meter = Metriks.utilization_timer('requests')
  puts "utilization: #{meter.fifteen_minute_utilization * 100}%"
```

### mean_utilization()

Returns the mean (average) utilization as a percentage between `0.0` and `1.0`
since the process started.

``` ruby
  meter = Metriks.utilization_timer('requests')
  puts "utilization: #{meter.mean_utilization * 100}%"
```


# Reporter Overview

How to get metrics out of the process.

## Graphite Reporter

Sends metrics to Graphite every 60 seconds.

``` ruby
  reporter = Metriks::Reporter::Graphite.new 'localhost', 3004
  reporter.start
```


## Logger Reporter

Send metrics to a logger every 60 seconds.

``` ruby
  reporter = Metriks::Reporter::Logger.new(:logger => Logger.new('log/metrics.log'))
  reporter.start
```


## Librato Metrics Reporter

The Librato Metrics reporter has been moved to
[eric/metriks-librato_metrics](https://github.com/eric/metriks-librato_metrics).


## Proc Title Reporter

Provides a simple way to get up-to-date statistics from a process by
updating the proctitle every 5 seconds (default).

``` ruby
  reporter = Metriks::Reporter::ProcTitle.new :interval => 5
  reporter.add 'reqs', 'sec' do
    Metriks.meter('rack.requests').one_minute_rate
  end
  reporter.start
```

will display:

```
501      17015 26.0  1.9 416976 246956 ?       Ss   18:54  11:43 thin reqs: 273.3/sec
```

## Sematext Metrics Reporter

[metriks-sematext](https://github.com/sematext/metriks-sematext) gem provides reporter for sending metrics to [SPM](http://sematext.com/spm/index.html).

# Application Server Configuration

Depending on how your application server operates, you may need to configure how reporters are created. Please look at [Troubleshooting](https://github.com/eric/metriks/wiki/Troubleshooting) for more information.

# Plans

An incomplete list of things I would like to see added:

* Rack middleware to measure utilization, throughput and worker time
* Basic reporters:
  * Rack endpoint returning JSON
  * [Statsd](https://github.com/etsy/statsd) reporter
* Metaprogramming instrumentation hooks like [Shopify's statsd-instrument](https://github.com/Shopify/statsd-instrument)


# Credits

Most of the inspiration for this project comes from Coda Hale's amazing
[Metrics, Metrics Everywhere][metrics-talk] talk at CodeConf and his sweet
[Metrics][metrics] Java Library.

[metrics-talk]: http://pivotallabs.com/talks/139-metrics-metrics-everywhere
[metrics]: https://github.com/codahale/metrics


# License

Copyright (c) 2012 Eric Lindvall

Published under the MIT License, see LICENSE
