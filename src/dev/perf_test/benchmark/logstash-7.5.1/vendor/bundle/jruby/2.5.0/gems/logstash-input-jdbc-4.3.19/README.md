# Logstash JDBC Input Plugin

This is a plugin for [Logstash](https://github.com/elastic/logstash).

It is fully free and fully open source. The license is Apache 2.0, meaning you are pretty much free to use it however you want in whatever way.

## Documentation

Logstash provides infrastructure to automatically generate documentation for this plugin. We use the asciidoc format to write documentation so any comments in the source code will be first converted into asciidoc and then into html. All plugin documentation are placed under one [central location](http://www.elastic.co/guide/en/logstash/current/).

- For formatting code or config example, you can use the asciidoc `[source,ruby]` directive
- For more asciidoc formatting tips, see the excellent reference here https://github.com/elastic/docs#asciidoc-guide

## Need Help?

Need help? Try #logstash on freenode IRC or the https://discuss.elastic.co/c/logstash discussion forum.

## Developing

### 1. Plugin Developement and Testing

#### Code
- To get started, you'll need JRuby with the Bundler gem installed.

- Create a new plugin or clone and existing from the GitHub [logstash-plugins](https://github.com/logstash-plugins) organization.

- Install dependencies
```sh
bundle install
```

#### Test

```sh
bundle exec rspec
```

The Logstash code required to run the tests/specs is specified in the `Gemfile` by the line similar to:
```ruby
gem "logstash", :github => "elasticsearch/logstash", :branch => "1.5"
```
To test against another version or a local Logstash, edit the `Gemfile` to specify an alternative location, for example:
```ruby
gem "logstash", :github => "elasticsearch/logstash", :ref => "master"
```
```ruby
gem "logstash", :path => "/your/local/logstash"
```

Then update your dependencies and run your tests:

```sh
bundle install
bundle exec rspec
```

### 2. Running your unpublished Plugin in Logstash

#### 2.1 Run in a local Logstash clone

- Edit Logstash `tools/Gemfile` and add the local plugin path, for example:
```ruby
gem "logstash-input-jdbc", :path => "/your/local/logstash-input-jdbc"
```
- Update Logstash dependencies
```sh
rake vendor:gems
```
- Run Logstash with your plugin
```sh
bin/logstash -e 'input {jdbc {..}}'
```
At this point any modifications to the plugin code will be applied to this local Logstash setup. After modifying the plugin, simply rerun Logstash.

#### 2.2 Run in an installed Logstash

- Build your plugin gem
```sh
gem build logstash-input-jdbc.gemspec
```
- Install the plugin from the Logstash home
```sh
bin/plugin install /your/local/plugin/logstash-input-jdbc.gem
```
- Start Logstash and proceed to test the plugin

## Example configuration

Reading data from MySQL:  

	input {
	  jdbc {
	    jdbc_driver_library => "/path/to/mysql-connector-java-5.1.33-bin.jar"
	    jdbc_driver_class => "com.mysql.jdbc.Driver"
	    jdbc_connection_string => "jdbc:mysql://host:port/database"
	    jdbc_user => "user"
	    jdbc_password => "password"
      # or jdbc_password_filepath => "/path/to/my/password_file"
	    statement => "SELECT ..."
	    jdbc_paging_enabled => "true"
	    jdbc_page_size => "50000"
	  }
	}

	filter {
	  [some filters here]
	}

	output {
	  stdout {
	    codec => rubydebug
	  }
	  elasticsearch_http {
	    host => "host"
	    index => "myindex"
	  }
	}

## Contributing

All contributions are welcome: ideas, patches, documentation, bug reports, complaints, and even something you drew up on a napkin.

Programming is not a required skill. Whatever you've seen about open source and maintainers or community members  saying "send patches or die" - you will not see that here.

It is more important to me that you are able to contribute.

For more information about contributing, see the [CONTRIBUTING](https://github.com/elastic/logstash/blob/master/CONTRIBUTING.md) file.
