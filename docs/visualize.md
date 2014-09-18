# Visualize

The "Visualize" app is used to design and create saved visualizations that can be used on Dashboards. The data source for a visualization can be based on three types: a new adhoc search, a saved search, or an existing saved visualization. Visualizations are based on the aggregation feature introduced in Elasticsearch 1.x.

## Getting Started

To create a new visualization either click on the visualize tab at the top of the screen or the new document button to the left of the search search bar. This will start the "New Visualization Wizard".

* **Step 1:** Choose the data source for the new visualization - This can been a new search, saved search, or you can create a new visualization based on an existing one.
  * If you choose *"New search"* you will then need to select the index pattern.
  * If you choose *"From a saved search"* you will then need to choose a saved search.
  * If you choose *"From an existing visualization"* you will then need to choose a saved visualization.
* **Step 2:** Choose the visualization type. Currently there are only three types of visualizations: Histogram, Line, and Pie Chart. More visualization types will be added in the future iterations.

Once the visualization wizard is complete you will be presented with the "visualization editor".

## Visualization Editor

The visualization editor is where you will configure and edit your visualization. There are three parts to the visualization editor:

1. Toolbar Panel
1. Aggregation Panel
1. Preview Panel

### Toolbar Panel

The toolbar panel is used for configuring the adhoc search terms managing the saved visualizations. When you choose "New search" in the wizard, you will be presented with a search bar where you can add your search terms. For visualizations based on saved searches, the search bar will be grayed out with text linking back to the saved search. You can also double click the grayed out save search link to convert it to an adhoc search. To the right of the search box there are a row of icons for creating new visualizations, saving the current visualization, loading an existing visualization, sharing or embedding the visualization, and refreshing the data for the current visualization.

### Aggregation Panel

The aggregation panel is used for configuring the metrics and buckets for a visualization. (If you are coming from the SQL world, buckets are essentially group-bys.) For a histogram or line chart the "metric" is used for the y-axis and the "buckets" are used for the x-axis, segment bar colors, and row/column splits. For pie charts the "metric" is used for the size of the slice and the "bucket" is used for the number of slices.

For the remainder of this documentation we are going to use the histogram as our example when discussing the features of the aggregation panel. The same concepts apply to the other visualizations but the histogram is the workhorse of the visualization world.

The aggregation panel allows you to choose which "metric" aggregation you would like to use for the x-axis. The available metrics are: count, average, sum, min, max, and unique count (cardinality). The "bucket" aggregations are used for the x-axis, color slices, and row/columns splits.  The available "bucket" aggregations are: date histogram, histogram, range, terms, filters, and significant terms.

You can also change the execution order of the buckets. In Elasticsearch the first aggregation determines the data set for the subsequent aggregations. For example, lets say you want to create a date histogram of the hits for top 5 extensions.  If you want to have the same extension across all of the hits then you will need to set the order as follows:

1. Color: Terms aggregation of extensions
1. X-Axis: Date Histogram of @timestamp

Inside Elasticsearch, it collects the records for the top 5 extensions then creates a date histogram for each of them. Let say you now want the top 5 extensions for each hour then you would use the following order:

1. X-Axis: Date Histogram of @timestamp (with 1 hour interval)
1. Color: Terms aggregation of extensions

For this requests Elasticsearch will create a date histogram from all the records then group the top five extensions inside each bucket (or hour since we specified an hour interval). Just remember each subsequent bucket slices the data from the previous bucket.

### Preview Panel

The preview panel will render the visualization once you click the apply button (below the buckets on the aggregation panel).
