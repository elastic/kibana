<!-- render {"template":"# Kibana <%= pkg.version %>"} -->
# Kibana 4.0.0-beta3
<!-- /render -->

[![Build Status](https://travis-ci.org/elasticsearch/kibana.svg?branch=master)](https://travis-ci.org/elasticsearch/kibana?branch=master)

Kibana is an open source (Apache Licensed), browser based analytics and search dashboard for Elasticsearch. Kibana is a snap to setup and start using. Kibana strives to be easy to get started with, while also being flexible and powerful, just like Elasticsearch.

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Discover](#discover)
- [Visualize](#visualize)
- [Dashboard](#dashboard)
- [Settings](#settings)

## Requirements

- Java
- Elasticsearch version 1.4.0 or later
- ...and nothing else

## Installation

* Download: [http://www.elasticsearch.org/overview/kibana/installation/](http://www.elasticsearch.org/overview/kibana/installation/)
* Run `bin/kibana` on unix, or `bin/kibana.bat` on Windows.
* Visit [http://localhost:5601](http://localhost:5601)

<!-- include {"path":"docs/quick_start.md"} -->
## Quick Start

You're up and running! Fantastic! Kibana is now running on port 5601, so point your browser at http://YOURDOMAIN.com:5601.

The first screen you arrive at will ask you to configure an **index pattern**. An index pattern describes to Kibana how to access your data. We make the guess that you're working with log data, and we hope (because it's awesome) that you're working with Logstash. By default, we fill in `logstash-*` as your index pattern, thus the only thing you need to do is select which field contains the timestamp you'd like to use. Kibana reads your Elasticsearch mapping to find your time fields - select one from the list and hit *Create*.

**Tip:** there's an optimization in the way of the *Use event times to create index names* option. Since Logstash creates an index every day, Kibana uses that fact to only search indices that could possibly contain data in your selected time range.

Congratulations, you have an index pattern! You should now be looking at a paginated list of the fields in your index or indices, as well as some informative data about them. Kibana has automatically set this new index pattern as your default index pattern. If you'd like to know more about index patterns, pop into to the [Settings](#settings) section of the documentation.

**Did you know:** Both *indices* and *indexes* are acceptable plural forms of the word *index*. Knowledge is power.

Now that you've configured an index pattern, you're ready to hop over to the [Discover](#discover) screen and try out a few searches. Click on **Discover** in the navigation bar at the top of the screen.
<!-- /include -->
<!-- include {"path":"docs/discover.md"} -->
## Discover

Discover is your first step on the road to information enlightenment. From this interface you have access to every document, in every index that matches your configured index pattern. For the purpose of this documentation, we will assume you have selected a time field. If you didn't, ignore anything that mentions time.

You should see a few things:

- A list of documents
- A list of fields
- A time chart

If you don't see any documents, it is possible that:

- You don't **have** any documents
- Your time range is too narrow

By default Kibana shows the last 15 minutes of data. You might want to expand this by clicking the time in the top right of the screen and selecting a broader range.

### Document list

Once you see some documents, you can begin to explore Discover. In the document list, Kibana will show you the localized version of the time field you specified in your index pattern, as well as the `_source` of the Elasticsearch document.

**Tip:** By default the table contains 500 of the most recent documents. You can increase the number of documents in the table from the advanced settings screen. See the [Setting section](#advanced) of the documentation.

Click on the expand button to the left of the time. Kibana will read the fields from the document and present them in a table. The + and - buttons allow you to quickly filter for documents that share common traits with the one you're looking at. Click the JSON tab at the top of the table to see the full, pretty printed, original document.

Click the expand button again to collapse the detailed view of the document.

### Field list

The field list has several powerful functions. The first being the ability to add columns to the document list. If no fields are selected `_source` will be automatically selected and shown in the table. Mouse over a field name and click the **add** button that appears. Now, instead of seeing `_source` in the document list, you have the extracted value of the selected field. In addition, the field name has moved up to the **Selected** section of the field list. Add a few more fields. Sweet!

Now, instead of clicking the **add** button, click the name of the field itself. You will see a breakdown of the 5 most popular values for the field, as well as a count of how many records in the document list the field is present in.

In addition, the Visualize button will pop you over to the **Visualize** application and run a more detailed aggregation on the field. For more information about visualization, see the [Visualize section](#visualize) of the docs.

### Filters
When you expand a document in the document list you will see two magnifying glasses next to indexed terms, one with a plus sign and one with a minus sign. If you click on the magnifying glass with the plus sign it will add a filter to the query for that term. If you click on the magnifying glass with the minus sign, it will add a negative filter (which will remove any documents containing the term). Both filters will appear in the filter bar underneath the **search bar**. When you hover over the filters in the filter bar you will see an option to toggle or remove them. There is also a link to remove all the filters.


### Sorting

You may have noticed that documents appear in reverse chronological order by default, meaning the newest documents are shown first. You can change this by clicking on the **Time** column header. In fact, any column can be sorted in this manner as long as it is indexed in Elasticsearch. Note that some fields are not indexed by default, such as `_id`, and that others may have indexing disabled in the Elasticsearch mapping. See the [Settings > Index Patterns](#indices) section of the docs for more details.

You can also reorder columns by placing your mouse over the column header and clicking the left and right arrows that appear.

### The Time Chart

The time chart runs an Elasticsearch aggregation to show the time stamps associated with documents in the table. Hover over a bar in the chart to see the count of documents contained within it. Clicking on the bar will narrow the selected time range to match the time range of that bar. If you hover over the background of the chart (not a bar) the cursor will become a crosshair. In this mode you can click-and-drag to select a new time range.

### Searching

See the [Querying section](#querying) of the documentation.

### Saving and reloading searches.

Click the save button to save your search for later, or to reuse it in other screens, such as Visualize. Saved searches can be loaded via the folder icon.


### Querying

The search bar at the top allows Kibana to use Elasticsearch's support for Lucene Query String syntax. Let's say we're searching web server logs that have been parsed into a few fields.

We can of course do free text search. Find requests that contain the number 200, in any field.

```
200
```

Or we can search in a specific field. Find 200 in the status field:

```
status:200
```

Find all from 400-499 status codes:

```
status:[400 TO 499]
```

Find status codes 400-499 with the extension php:

```
status:[400 TO 499] AND extension:PHP
```

Or HTML

```
status:[400 TO 499] AND (extension:php OR extension:html)
```

You can read more about the Lucene Query String syntax in the [Lucene documentation](https://lucene.apache.org/core/2_9_4/queryparsersyntax.html).

While Lucene query syntax is simple and very powerful, Kibana also supports the full Elasticsearch, JSON based, Query DSL. See the [Elasticsearch documentation](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax) for usage and examples.
<!-- /include -->
<!-- include {"path":"docs/visualize.md"} -->
## Visualize

The **Visualize** app is used to design and create saved visualizations that can be used on their own, or added to a dashboard. The data source for a visualization can be based on three types: a new interactive search, a saved search, or an existing saved visualization. Visualizations are based on the aggregation feature introduced in Elasticsearch 1.x. Aggregations are highly performant, but may require significant memory from Elasticsearch.

### Getting Started

To create a new visualization either click on the visualize tab at the top of the screen or the new document button in the toolbar panel to the right of the search bar. This will start the *New Visualization Wizard*.

- **Step 1:** Choose the data source for the new visualization - You have 3 options here:
  - *"From a new search"* : Pick an index pattern and search as you create your visualization
  - *"From a saved search"* : Pick a Saved Search and create a visualization from it. If you later save the visualization it will be tied to this search. This means if you edit the search later, say in Discover, any visualization that uses it will also be updated automatically.
  - *"From an existing visualization"* Pick an existing visualization and make changes to it.
- **Step 2:** Choose a visualization type from the list of currently available visualizations.

Once the visualization wizard is complete you will be presented with the *visualization editor*.

### Visualization Editor

The visualization editor is where you will configure and edit your visualization. There are three parts to the visualization editor:

1. [Toolbar Panel](#toolbar-panel)
1. [Aggregation Builder](#aggregation-builder)
1. [Preview Canvas](#preview-canvas)

#### Toolbar Panel

The toolbar panel is used for interactive searching of data as well as saving and loading visualizations. When you choose *New search* in the wizard, you will be presented with a search bar where you can add your search terms. For visualizations based on saved searches, the search bar will be disabled, but you can double click the grayed out saved search link to convert it to an interactive search.

To the right of the search box there are a row of icons for creating new visualizations, saving the current visualization, loading an existing visualization, sharing or embedding the visualization, and refreshing the data for the current visualization.

#### Aggregation Builder

The aggregation builder on the left of the screen is used for configuring the [metric](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-aggregations.html#_metrics_aggregations) and [bucket](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-aggregations.html#_bucket_aggregations) aggregations used to create a visualization. (If you are coming from the SQL world, buckets are similar to group-bys. Check out the [Elasticsearch docs](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-aggregations.html) for more info) For a bar chart or line chart, the *metric* is used for the y-axis and the *buckets* are used for the x-axis, segment bar colors, and row/column splits. For pie charts the "metric" is used for the size of the slice and the *bucket* is used for the number of slices. Other visualizations may use these in new and different ways.

For the remainder of this documentation we are going to use the bar chart as our example when discussing the features of the aggregation panel. The same concepts apply to the other visualizations but the bar chart is the workhorse of the visualization world.

The aggregation builder allows you to choose which *metric* aggregation you would like to use for the x-axis. Examples include: count, average, sum, min, max, and unique count (cardinality). The *bucket* aggregations are used for the x-axis, color slices, and row/columns splits.  Example *bucket* aggregations include date histogram, range, terms, filters, and significant terms.

You can also change the execution order of the buckets. In Elasticsearch the first aggregation determines the data set for the subsequent aggregations. For example, lets say you want to create a date bar chart of the hits for top 5 extensions.  If you want to have the same extension across all of the hits then you will need to set the order as follows:

1. **Color:** Terms aggregation of extensions
1. **X-Axis:** Date bar chart of `@timestamp`

Inside Elasticsearch, it collects the records for the top 5 extensions then creates a date bar chart for each of them. Let say you now want the top 5 extensions for each hour then you would use the following order:

1. **X-Axis:** Date bar chart of `@timestamp` (with 1 hour interval)
1. **Color:** Terms aggregation of extensions

For these requests, Elasticsearch will create a date bar chart from all the records then group the top five extensions inside each bucket (or hour since we specified an hour interval). Just remember each subsequent bucket slices the data from the previous bucket.

#### Preview Canvas

The preview canvas will render the visualization once you click the apply button below the buckets in the aggregation builder.

You can refresh this preview by clicking the refresh button on the far-right of the toolbar.
<!-- /include -->
<!-- include {"path":"docs/dashboard.md"} -->
## Dashboard

The dashboard is used to group and display any Visualizations you've created. Once you have a collection of visualizations that you like, you can save it as a custom dashboard to share or reload later.

### Getting Started

Using the dashboard requires that you have at least one [saved visualization](#visualize).

#### Creating a New Dashboard

The first time you open the Dashboard, it will be ready for you to build a new dashboard. You can create a new dashboard by clicking the left-most icon in the toolbar panel.

#### Adding Visualizations to a Dashboard

To add a visualization to the dashboard, click the plus button in the toolbar panel. A menu of your saved visualizations will appear.

From the menu, click on the visualization you want to include in your dashboard. If you have more then 5 saved visualizations, the list will paginate. You can also filter the list from the **Visualization Filter** at the top of the list.

Once you've clicked on the visualization, you will see it appear in a *container* in the dashboard below.

**NOTE:** You may see a message saying that the height and/or width of the container is too small. If you see this message, you can fix it by making the container larger - described below.

#### Saving Dashboards

Click on the save button in the toolbar panel to save the dashboard to Elasticsearch. Clicking the save icon will show you a menu below the toolbar panel where you can enter a name for your dashboard. After giving it a name, click the *Save* button.

#### Loading a Saved Dashboard

To load an existing dashboard, click on the *Open* icon in the toolbar menu. This will present you with a list of existing dashboard you can load. If you have more then 5 dashboards, you can use the filter input at the top to search for the dashboard you want to load or click the page links at the bottom of the loader panel.

#### Sharing Dashboards

To obtain the code needed to embed a dashboard in other applications, click the right-most icon in the toolbar menu. It will present you with menu containing two links.

##### Embedding Dashboards

Dashboards can be embedded in other web apps by using the embed code. Simply copy the embed code from the *Share* menu and paste it in your external web application. Note that anyone that views an embedded dashboard must also have access to Kibana.

##### Sharing Dashboards

Dashboards can also be shared with anyone that has access to Kibana. Simply copy the share link from the *Share* menu and share it with others via email or other means.

### Customizing Your Dashboard

The dashboard can be customized in a number of ways to suit your needs.

#### Moving Containers

To move containers around, drag the container by clicking and holding the header and moving it where you want it. Other containers may shift around to make room for the container you are moving. When you are happy with the location of the container, release the mouse button.

#### Resizing Containers

As you move the mouse cursor to the bottom right corner of the container, a small move icon will appear. Once your cursor changes the move icon, you can click and drag the container to make it the size you need.  When you let go of the mouse button, the visualization inside the container will adjust to the new container size.

#### Removing Containers

Containers can be removed from your dashboard by clicking on the close icon located in the top right of corner the container. This will not delete the saved visualization, it will remove it from the current Dashboard.

### Viewing Detailed Information

It may sometimes be useful to view the data that is being used to create the visualization. You can view this information by clicking on the bar at the bottom of the container. Doing so will hide the visualization and show the raw data it's using.  There are four tabs at the top of this view that break down the data in various ways.

#### Table

This is a representation of all the underlying data, presented as a paginated data grid. The items in this table can be sorted by clicking on the table headers at the top of each column.

#### Request

This is the raw request used to query the server, presented as prettified JSON text.

#### Response

This is the raw response from the server, presented as prettified JSON text.

#### Statistics

This is a summary of the statistics related to the request and the response, presented as a data grid. It includes information such as the query duration, the request duration, the total number of records found on the server and the index pattern used to make the query.

### Changing the Visualization

To change a visualization, click on the *Edit* icon at the top right of the visualization container. This will open that visualization in the *Visualize* app. Refer to the [Visualize docs](#visualize) for usage instructions.
<!-- /include -->
<!-- include {"path":"docs/settings.md"} -->
## Settings

The settings application is broken up into three pages: Indices, Advanced, and Object.

### Indices

The Indices page manages Index Patterns. Before you can do anything in Kibana you will need to create an Index Pattern to use in other parts of the application. Index Patterns represent one or more indices in Elasticsearch and track associated meta-data, like field types and pattern interval.

#### Creating an Index Pattern

If this is your first time in Kibana you'll be prompted to create your first index pattern. For more information on index pattern creation see the **Getting Started** section of the documentation.

### Advanced

Please, **use caution** on this page, because the advanced editor will let you break things.

The Advanced page allows modification of individual configuration parameters. Each of these parameters can be tweaked to customize the entire Kibana installation. This means that your changes will apply to all users. This could prevent the application from loading if used incorrectly.

#### Edit

Clicking on the edit button for any line will cause the *Value* column on that line to become an input, allowing you change the value.

Click the *Save* button to save your changes.

#### Reset

Clicking on the *Reset* button will undo any changes you made and restore the value back to its default.

### Objects

Please, **use caution** on this page. No support is available for changes made here.

The Objects page manages all of the objects created by Kibana (except Index Patterns which are handled by the Indices page).  Most apps give you all the tools needed to manage objects they create, but if/when they fall short, you can come here to tweak the specifics.

#### View

Clicking on the *View* action loads that item in the associated applications. Refer to the documentation for the associated applications if you need help using them.

#### Edit

Clicking *Edit* will allow you to change the title, description and other settings of the saved object. You can also edit the schema of the stored object.

*Note:* this operation is for advanced users only - making changes here can break large portions of the application.
<!-- /include -->