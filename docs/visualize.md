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
