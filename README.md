<<<<<<< HEAD
# Kibana 4.2.0-snapshot

[![Build Status](https://travis-ci.org/elastic/kibana.svg?branch=master)](https://travis-ci.org/elastic/kibana?branch=master)

Kibana is an open source ([Apache Licensed](https://github.com/elastic/kibana/blob/master/LICENSE.md)), browser based analytics and search dashboard for Elasticsearch. Kibana is a snap to setup and start using. Kibana strives to be easy to get started with, while also being flexible and powerful, just like Elasticsearch.

## Requirements

- Elasticsearch version 2.0.0 or later
- Kibana binary package

## Installation

* Download: [http://www.elastic.co/downloads/kibana](http://www.elastic.co/downloads/kibana)
* Run `bin/kibana` on unix, or `bin\kibana.bat` on Windows.
* Visit [http://localhost:5601](http://localhost:5601)

## Quick Start

You're up and running! Fantastic! Kibana is now running on port 5601, so point your browser at http://YOURDOMAIN.com:5601.

The first screen you arrive at will ask you to configure an **index pattern**. An index pattern describes to Kibana how to access your data. We make the guess that you're working with log data, and we hope (because it's awesome) that you're working with Logstash. By default, we fill in `logstash-*` as your index pattern, thus the only thing you need to do is select which field contains the timestamp you'd like to use. Kibana reads your Elasticsearch mapping to find your time fields - select one from the list and hit *Create*.

**Tip:** there's an optimization in the way of the *Use event times to create index names* option. Since Logstash creates an index every day, Kibana uses that fact to only search indices that could possibly contain data in your selected time range.

Congratulations, you have an index pattern! You should now be looking at a paginated list of the fields in your index or indices, as well as some informative data about them. Kibana has automatically set this new index pattern as your default index pattern. If you'd like to know more about index patterns, pop into to the [Settings](#settings) section of the documentation.

**Did you know:** Both *indices* and *indexes* are acceptable plural forms of the word *index*. Knowledge is power.

Now that you've configured an index pattern, you're ready to hop over to the [Discover](#discover) screen and try out a few searches. Click on **Discover** in the navigation bar at the top of the screen.

## Documentation

Visit [Elastic.co](http://www.elastic.co/guide/en/kibana/current/index.html) for the full Kibana documentation.

## Snapshot Builds

For the daring, snapshot builds are available. These builds are created after each commit to the master branch, and therefore are not something you should run in production.

| platform |  |  |
| --- | --- | --- |
| OSX | [tar](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-darwin-x64.tar.gz) | [zip](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-darwin-x64.zip) |
| Linux x64 | [tar](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-linux-x64.tar.gz) | [zip](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-linux-x64.zip) |
| Linux x86 | [tar](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-linux-x86.tar.gz) | [zip](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-linux-x86.zip) |
| Windows | [tar](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-windows.tar.gz) | [zip](http://download.elastic.co/kibana/kibana/kibana-4.2.0-snapshot-windows.zip) |
=======
# Kibana

__NOTE__: You have reached the Kibana 3 repository.
Kibana 3 is a completely new version of Kibana written entirely in HTML and Javascript. You can find
the Kibana 2 repository at [https://github.com/rashidkpc/Kibana](https://github.com/rashidkpc/Kibana)

More information about Kibana 3 can be found at [http://www.elasticsearch.org/overview/kibana/](http://www.elasticsearch.org/overview/kibana/)

## Overview

Kibana is an open source (Apache Licensed), browser based analytics and search interface to Logstash
and other timestamped data sets stored in ElasticSearch. With those in place Kibana is a snap to
setup and start using (seriously). Kibana strives to be easy to get started with, while also being
flexible and powerful

### Requirements
* Elasticsearch 0.90.9 or above
* A modern web browser. The latest version of Chrome, Safari and Firefox have all been tested to
work. IE9 and greater should work. IE8 does not.
* A webserver. No extensions are required, as long as it can serve plain html it will work
* A browser reachable Elasticsearch server. Port 9200 must be open, or a proxy configured to allow
access to it.

### Docs

Documentation, panel options and tutorials can be found at 
[http://www.elasticsearch.org/guide/en/kibana/current/](http://www.elasticsearch.org/guide/en/kibana/current/)

### Installation

1. Download and extract [http://download.elasticsearch.org/kibana/kibana/kibana-latest.zip](http://download.elasticsearch.org/kibana/kibana/kibana-latest.zip) to your webserver.
2. Edit config.js in your deployed directory to point to your elasticsearch server. This should __not be
http://localhost:9200__, but rather the fully qualified domain name of your elasticsearch server.
The url entered here _must be reachable_ by your browser.
3. Point your browser at your installation. If you're using Logstash with the default indexing
configuration the included Kibana logstash interface should work nicely.

### FAQ
__Q__: Why doesnt it work? I have http://localhost:9200 in my config.js, my webserver and elasticsearch
server are on the same machine  
__A__: Kibana 3 does not work like previous versions of Kibana. To ease deployment, the server side
component has been eliminated. Thus __the browser connects directly to Elasticsearch__. The default
config.js setup works for the webserver+Elasticsearch on the same machine scenario. Do not set it
to http://localhost:9200 unless your browser and elasticsearch are on the same machine

__Q__: How do I secure this? I don't want to leave 9200 open.  
__A__: A simple nginx virtual host and proxy configuration can be found in the sample/nginx.conf

__Q__: How to run the grunt build process.  
__A__: Steps to follow 
        a)Install node & npm 
        b)npm install -g grunt-cli
        c)npm install in kibana folder
        d)grunt build
        
        Useful links:
        	https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager
        	https://npmjs.org/doc/install.html
        	http://www.ghosthorses.co.uk/production-diary/installing-grunt-on-os-x-and-windows-7/

### Support

If you have questions or comments the best place to reach me is #logstash or #elasticsearch on irc.freenode.net

### Contributing

Please see [CONTRIBUTING.md](https://github.com/elasticsearch/kibana/blob/master/CONTRIBUTING.md). 
If you have a bugfix or new feature that you would like to contribute to Kibana, **please find or open an issue 
about it first.** 
>>>>>>> FETCH_HEAD
