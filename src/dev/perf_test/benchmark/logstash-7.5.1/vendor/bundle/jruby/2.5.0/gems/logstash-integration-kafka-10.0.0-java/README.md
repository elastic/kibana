# Logstash Plugin

[![Travis Build Status](https://travis-ci.org/logstash-plugins/logstash-integration-kafka.svg)](https://travis-ci.org/logstash-plugins/logstash-integration-kafka)

This is a plugin for [Logstash](https://github.com/elastic/logstash).

It is fully free and fully open source. The license is Apache 2.0, meaning you are pretty much free to use it however you want in whatever way.

## Logging

Kafka logs do not respect the Log4J2 root logger level and defaults to INFO, for other levels, you must explicitly set the log level in your Logstash deployment's `log4j2.properties` file, e.g.:
```
logger.kafka.name=org.apache.kafka
logger.kafka.appenderRef.console.ref=console
logger.kafka.level=debug
```

## Documentation

https://www.elastic.co/guide/en/logstash/current/plugins-inputs-kafka.html

Logstash provides infrastructure to automatically generate documentation for this plugin. We use the asciidoc format to write documentation so any comments in the source code will be first converted into asciidoc and then into html. All plugin documentation are placed under one [central location](http://www.elastic.co/guide/en/logstash/current/).

- For formatting code or config example, you can use the asciidoc `[source,ruby]` directive
- For more asciidoc formatting tips, see the excellent reference here https://github.com/elastic/docs#asciidoc-guide

## Need Help?

Need help? Try #logstash on freenode IRC or the https://discuss.elastic.co/c/logstash discussion forum.

## Developing

### 1. Plugin Developement and Testing

#### Code
- To get started, you'll need JRuby with the Bundler gem installed.

- Create a new plugin or clone and existing from the GitHub [logstash-plugins](https://github.com/logstash-plugins) organization. We also provide [example plugins](https://github.com/logstash-plugins?query=example).

- Install dependencies

```sh
bundle install
rake install_jars
```

#### Test

- Update your dependencies

```sh
bundle install
rake install_jars
```

- Run unit tests

```sh
bundle exec rspec
```

- Run integration tests

you'll need to have docker available within your test environment before 
running the integration tests. The tests depend on a specific Kafka image 
found in Docker Hub called `spotify/kafka`. You will need internet connectivity
to pull in this image if it does not already exist locally.

```sh
bundle exec rspec --tag integration
```

### 2. Running your unpublished Plugin in Logstash

#### 2.1 Run in a local Logstash clone

- Edit Logstash `Gemfile` and add the local plugin path, for example:
```ruby
gem "logstash-output-kafka", :path => "/your/local/logstash-output-kafka"
```
- Install plugin
```sh
# Logstash 2.3 and higher
bin/logstash-plugin install --no-verify

# Prior to Logstash 2.3
bin/plugin install --no-verify

```
- Run Logstash with your plugin
```sh
bin/logstash -e 'output { kafka { topic_id => "kafka_topic" }}'
```
At this point any modifications to the plugin code will be applied to this local Logstash setup. After modifying the plugin, simply rerun Logstash.

#### 2.2 Run in an installed Logstash

You can use the same **2.1** method to run your plugin in an installed Logstash by editing its `Gemfile` and pointing the `:path` to your local plugin development directory or you can build the gem and install it using:

- Build your plugin gem
```sh
gem build logstash-output-kafka.gemspec
```
- Install the plugin from the Logstash home
```sh
bin/plugin install /your/local/plugin/logstash-output-kafka.gem
```
- Start Logstash and proceed to test the plugin

## Contributing

All contributions are welcome: ideas, patches, documentation, bug reports, complaints, and even something you drew up on a napkin.

Programming is not a required skill. Whatever you've seen about open source and maintainers or community members  saying "send patches or die" - you will not see that here.

It is more important to the community that you are able to contribute.

For more information about contributing, see the [CONTRIBUTING](https://github.com/elastic/logstash/blob/master/CONTRIBUTING.md) file.
