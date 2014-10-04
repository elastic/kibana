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
