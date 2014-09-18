<!-- render {"template":"# Kibana <%= pkg.version %>"} -->
# Kibana 4.0.0-BETA1
<!-- /render -->

[![Build Status](https://magnum.travis-ci.com/elasticsearch/kibana4.svg?token=tsFxSKHtVKG8EZavSjXY&branch=master)](https://magnum.travis-ci.com/elasticsearch/kibana4)

Kibana is an open source (Apache Licensed), browser based analytics and search dashboard for Elasticsearch. Kibana is a snap to setup and start using. Kibana strives to be easy to get started with, while also being flexible and powerful, just like Elasticsearch.

## Installation

* Download: http://www.elasticsearch.org/overview/kibana/installation/
* Run **bin/kibana** on unix, or **bin/kibana.bat** on Windows.
* Visit http://localhost:5601

## Need Help?

Need help? Try #elasticsearch or #logstash on Freenode IRC. You can also find help on the elasticsearch-users@googlegroups.com or logstash-users@googlegroups.com mailing lists.

You can also find documentation at http://www.elasticsearch.com/guide/en/kibana/current

<!-- include {"path":"src/kibana/apps/settings/README.md"} -->
# Settings

The settings application is broken up into three pages: Indices, Advanced, and Object.

## Indices

The Indices page manages Index Patterns. Before you can do anything in Kibana you will need to create an Index Pattern, and it will follow you throughout all of the other apps. Index Patterns represent one or more indices in Elasticsearch and track associated meta-data, like field types and pattern interval.

## Advanced

The Advanced page allows modification of individual configuration parameters. Each of these parameters can be tweaked to customize the entire Kibana installation. This means that your changes will apply to all users. Please, **use caution** on this page, because the advanced editor will let you break things. This could prevent the application from loading if used incorrectly.

## Objects

The Objects page manages all of the objects created by Kibana (except Index Patterns which are handled but the Indices page). Today, that includes Dashboards, Visualizations, and Searches (created by the Discover app). Most apps give you all the tools needed to manage objects they create, but if/when they fall short you can come here to beat your objects into submission.

Just like the Advanced editor, it is pretty easy to break things with the objects editor so please **use caution**.
<!-- /include -->