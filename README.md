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

<!-- include {"path":"docs/settings.md"} -->
# Settings

The settings application is broken up into three pages: Indices, Advanced, and Object.

## Indices

The Indices page manages Index Patterns. Before you can do anything in Kibana you will need to create an Index Pattern, and it will follow you throughout all of the other apps. Index Patterns represent one or more indices in Elasticsearch and track associated meta-data, like field types and pattern interval.

### Index Contains Time-Based Events

*what does this checkbox mean/do?*

### Use Event Times to Create Index Names

*what does this checkbox mean/do?*

#### Index Pattern Interval

*...explain what the list of indexes that are shown means, and blue vs green color*

### Time-Field Name

*what's this do, why's it important?*

## Advanced

Please, **use caution** on this page, because the advanced editor will let you break things.

The Advanced page allows modification of individual configuration parameters. Each of these parameters can be tweaked to customize the entire Kibana installation. This means that your changes will apply to all users. This could prevent the application from loading if used incorrectly.

### Edit

### Save

### Delete

## Objects

Please, **use caution** on this page, because the advanced editor will let you break things.

The Objects page manages all of the objects created by Kibana (except Index Patterns which are handled by the Indices page). Today, that includes Dashboards, Visualizations, and Searches (created by the Discover app).

Most apps give you all the tools needed to manage objects they create, but if/when they fall short, you can come here to tweak the specifics.

### View

Clicking on the *View* action loads that item in the associated applications. Refer to the documentation for the associated applications if you need help using them.

### Edit

....
<!-- /include -->