# Easily Add an HTTP Client to your Logstash Plugin!

[![Travis Build Status](https://travis-ci.org/logstash-plugins/logstash-mixin-http_client.svg)](https://travis-ci.org/logstash-plugins/logstash-mixin-http_client)

HTTP clients have a lot of configurable options (proxies, certificates, headers, etc.), and specifying all of these with proper validation for a logstash plugin can be irritating. We built this plugin while building our [HTTP Poller Input](https://github.com/logstash-plugins/logstash-input-http_poller). If you need to build a plugin that works primarily based around HTTP this mixin makes it easy and consistent! It is based on [Manticore](https://github.com/cheald/manticore) a lightning quick, fully featured JRuby HTTP client based on Apache Commons HTTP Client.`

[![Travis Build Status](https://travis-ci.org/logstash-plugins/logstash-mixin-http_client.svg)](https://travis-ci.org/logstash-plugins/logstash-mixin-http_client)

This is a plugin for [Logstash](https://github.com/elastic/logstash).

It is fully free and fully open source. The license is Apache 2.0, meaning you are pretty much free to use it however you want in whatever way.

This plugin exposes the following options:

```ruby
# Timeout (in seconds) for the entire request
config :request_timeout, :validate => :number, :default => 60

# Timeout (in seconds) to wait for data on the socket. Default is 10s
config :socket_timeout, :validate => :number, :default => 10

# Timeout (in seconds) to wait for a connection to be established. Default is 10s
config :connect_timeout, :validate => :number, :default => 10

# Should redirects be followed? Defaults to true
config :follow_redirects, :validate => :boolean, :default => true

# Max number of concurrent connections. Defaults to 50
config :pool_max, :validate => :number, :default => 50

# Max number of concurrent connections to a single host. Defaults to 25
config :pool_max_per_route, :validate => :number, :default => 25

# Enable HTTP keepalive support, enabled by default
config :keepalive, :validate => :boolean, :default => true

# How many times should the client retry a failing URL? Default is 3
config :automatic_retries, :validate => :number, :default => 3

# If you need to use a custom X.509 CA (.pem certs) specify the path to that here
config :ca_path, :validate => :path

# If you need to use a custom keystore (.jks) specify that here
config :truststore_path, :validate => :path

# Specify the keystore password here.
# Note, most .jks files created with keytool require a password!
config :truststore_password, :validate => :password

# Specify the keystore type here. One of "JKS" or "PKCS12". Default is "JKS"
config :truststore_type, :validate => :string, :default => "JKS"

# Enable cookie support. With this enabled the client will persist cookies
# across requests as a normal web browser would. Enabled by default
config :cookies, :validate => :boolean, :default => true

# If you'd like to use an HTTP proxy . This supports multiple configuration syntaxes:
# 1. Proxy host in form: http://proxy.org:1234
# 2. Proxy host in form: {host => "proxy.org", port => 80, scheme => 'http', user => 'username@host', password => 'password'}
# 3. Proxy host in form: {url =>  'http://proxy.org:1234', user => 'username@host', password => 'password'}
config :proxy

# If you'd like to use a client certificate (note, most people don't want this) set the path to the x509 cert here
config :client_cert, :validate => :path
# If you'd like to use a client certificate (note, most people don't want this) set the path to the x509 key here
config :client_key, :validate => :path

# If you'd like to use authentication. Options available include:
#
# user     - username to be used
# password - password to be used
# eager    - eagerly offer the Authorization header before the server challenges for it
config :auth
```

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

- Create a new plugin or clone and existing from the GitHub [logstash-plugins](https://github.com/logstash-plugins) organization. We also provide [example plugins](https://github.com/logstash-plugins?query=example).

- Install dependencies
```sh
bundle install
```

#### Test

- Update your dependencies

```sh
bundle install
```

- Run tests

```sh
bundle exec rspec
```

### 2. Running your unpublished Plugin in Logstash

#### 2.1 Run in a local Logstash clone

- Edit Logstash `Gemfile` and add the local plugin path, for example:
```ruby
gem "logstash-filter-awesome", :path => "/your/local/logstash-filter-awesome"
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
bin/logstash -e 'filter {awesome {}}'
```
At this point any modifications to the plugin code will be applied to this local Logstash setup. After modifying the plugin, simply rerun Logstash.

#### 2.2 Run in an installed Logstash

You can use the same **2.1** method to run your plugin in an installed Logstash by editing its `Gemfile` and pointing the `:path` to your local plugin development directory or you can build the gem and install it using:

- Build your plugin gem
```sh
gem build logstash-filter-awesome.gemspec
```
- Install the plugin from the Logstash home
```sh
# Logstash 2.3 and higher
bin/logstash-plugin install --no-verify

# Prior to Logstash 2.3
bin/plugin install --no-verify

```
- Start Logstash and proceed to test the plugin

## Contributing

All contributions are welcome: ideas, patches, documentation, bug reports, complaints, and even something you drew up on a napkin.

Programming is not a required skill. Whatever you've seen about open source and maintainers or community members  saying "send patches or die" - you will not see that here.

It is more important to the community that you are able to contribute.

For more information about contributing, see the [CONTRIBUTING](https://github.com/elastic/logstash/blob/master/CONTRIBUTING.md) file.
