# Settings

The settings application is broken up into three pages: Indices, Advanced, and Object.

## Indices

The Indices page manages Index Patterns. Before you can do anything in Kibana you will need to create an Index Pattern, and it will follow you throughout all of the other apps. Index Patterns represent one or more indices in Elasticsearch and track associated meta-data, like field types and pattern interval.

## Advanced

The Advanced page allows modification of individual configuration parameters. Each of these parameters can be tweaked to customize the entire Kibana installation. This means that your changes will apply to all users. Please, **use caution** on this page, because the advanced editor will let you break things. This could prevent the application from loading if used incorrectly.

## Objects

The Objects page manages all of the objects created by Kibana (except Index Patterns which are handled but the Indices page). Today, that includes Dashboards, Visualizations, and Searches (created by the Discover app). Most apps give you all the tools needed to manage objects they create, but if/when they fall short you can come here to beat your objects into submission.

Just like the Advanced editor, it is pretty easy to break things with the objects editor so please **use caution**.
