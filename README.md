# Kibana 5.0.0-alpha5

Kibana is an open source ([Apache Licensed](https://github.com/elastic/kibana/blob/master/LICENSE.md)), browser based analytics and search dashboard for Elasticsearch. Kibana is a snap to setup and start using. Kibana strives to be easy to get started with, while also being flexible and powerful, just like Elasticsearch.

## Requirements

- Elasticsearch master
- Kibana binary package

## Installation

* Download: [http://www.elastic.co/downloads/kibana](http://www.elastic.co/downloads/kibana)
* Extract the files
* Run `bin/kibana` on unix, or `bin\kibana.bat` on Windows.
* Visit [http://localhost:5601](http://localhost:5601)


## Upgrade from previous version

* Move any custom configurations in your old kibana.yml to your new one
* Reinstall plugins
* Start or restart Kibana

## Quick Start

You're up and running! Fantastic! Kibana is now running on port 5601, so point your browser at http://YOURDOMAIN.com:5601.

The first screen you arrive at will ask you to configure an **index pattern**. An index pattern describes to Kibana how to access your data. We make the guess that you're working with log data, and we hope (because it's awesome) that you're working with Logstash. By default, we fill in `logstash-*` as your index pattern, thus the only thing you need to do is select which field contains the timestamp you'd like to use. Kibana reads your Elasticsearch mapping to find your time fields - select one from the list and hit *Create*.

Congratulations, you have an index pattern! You should now be looking at a paginated list of the fields in your index or indices, as well as some informative data about them. Kibana has automatically set this new index pattern as your default index pattern. If you'd like to know more about index patterns, pop into to the [Settings](#settings) section of the documentation.

**Did you know:** Both *indices* and *indexes* are acceptable plural forms of the word *index*. Knowledge is power.

Now that you've configured an index pattern, you're ready to hop over to the [Discover](#discover) screen and try out a few searches. Click on **Discover** in the navigation bar at the top of the screen.

## Documentation

Visit [Elastic.co](http://www.elastic.co/guide/en/kibana/current/index.html) for the full Kibana documentation.

## Snapshot Builds

For the daring, snapshot builds are available. These builds are created after each commit to the master branch, and therefore are not something you should run in production.

| platform |  |
| --- | --- |
| OSX | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-darwin-x64.tar.gz) |
| Linux x64 | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-linux-x64.tar.gz) [deb](https://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-amd64.deb) [rpm](https://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-x86_64.rpm) |
| Linux x86 | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-linux-x86.tar.gz) [deb](https://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-i386.deb) [rpm](https://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-i686.rpm) |
| Windows | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-alpha5-SNAPSHOT-windows-x86.zip) |
