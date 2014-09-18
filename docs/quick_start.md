## Quick Start

You're up and running! Fantastic! Kibana is now running on port 5601, so point your browser at http://YOURDOMAIN.com:5601.

The first screen you arrive at will ask you to configure an **index pattern**. An index pattern describes to kibana how to access your data. We make the guess that you're working with log data, and we hope (because its awesome) that you're working with logstash. By default we fill in logstash-* as your index pattern, thus the only input you must give to this process is to select which field contains the timestamp you'd like to use. Kibana reads your Elasticsearch mapping to find your time fields, select one from the list and hit *Create*.

**Tip**: there's an optimization in the way of the *Use event times ot create index names* option. This will use the fact that logstash creates an index every day to only search indices that could possibly contain data in your selected time range.

Great, you have an index pattern! You should now be looking at a paginated list of the fields in your index or indices, as well as some informative data about them. Kibana has automatically set this new index pattern as your default index pattern. If you'd like to know more about index patterns, pop into to the Settings section of the documentation.

**Did you know**: Both *indices* and **indexes** are acceptable plural forms of the word *index*. Knowledge is power.

Now that you've configured an index pattern, you're ready to hop over to the Discover screen and try out a few searches. Click on **Discover** in the navigation bar at the top of the screen.

## Discover

Discover is your first step on the road to information enlightenment. From this interface you have access to every document, in every index that matches your configured index pattern. For the purpose of this documentation, we will assume you have selected a time field. If you didn't ignore anything that mentions time.

You should see a few things:
- A list of documents
- A list of fields
- A time chart

If you don't see any documents, it is possible that:
- You don't **have** any documents. Might want to get some in there.
- Your time range is too narrow. By default Kibana shows the last 15 minutes of data. You might want to expand this out by clicking the time in the top right of the screen and selecting a broader range.

### Document list
Now that you see some documents you can begin to explore. In the document list Kibana will show you the localized version of the time field your specified in your index pattern, as well as the **_source** of the elasticsearch document. By default the table contains 500 of the most recent documents.

Tip: You can increase the number of document in the table from the advanced settings screen. See the Setting section of the documentation.

Click on the expand button to the left of the time. Kibana will read the fields from the document and present them in a list. The + and - buttons allow you to quickly filter for documents that share common traits with the one you're looking at. Click the JSON tab at the top of the list to see the full, pretty printed, original document.

Click the expand button again to collapse the detailed view of the document.

### Field list
The field list has several powerful functions. The first being the ability to add columns to the document table. If no fields are selected **_source** will be automatically selected and shown in the table. Mouse over a field name and click the **add** button that appears. Now, instead of seeing _source in the document list, you have the extracted value of the selected field. In addition, the field name has moved up to the **Selected** section of the field list. Add a few more fields. Sweet.

Now, instead of clicking the **add** button, click the name of the field itself. You will see a break down of the 5 most popular values for the field, as well as a count of how many records in the document list the field is present in.

In addition, the Visualize button will pop you over to the **Visualize** application and run a more detailed aggregation on the field. For more information about visualization, see the Visualize section of the docs.

### Sorting
You may have noticed that documents appear in the reverse chronological order by default, meaning the newest documents are shown first. You can change this by clicking on the **Time** column header. In fact, any column can be sorted in the manner as long as it is indexed in Elasticsearch. Note that some fields are not indexed by default, such as _id, and that other may have indexing disabled in the Elasticsearch mapping. See the Settings > Index Patterns section of the docs for more details.

You can also reorder columns by placing your mouse over the column header and clicking the left and right arrows that appear, however

### The time chart
The time chart runs an elasticsearch aggregation to create a chart of the time stamps associated with documents in the table. Hover over a bar in the chart to see the count of documents contained with in it. Clicking on the bar will narrow the selected time range to the time range represented by the bar. If you hover over a white area of the chart, ie, not a bar, the cursor will become a crosshair. In this mode you can click-and-draw to select a range of bars to filter down to

### Searching
See the **Querying** section of the documentation

### Saving and reloading searches.
Click the save button to save your search for later, or to reuse in other screens, such as Visualize. Saved searches can be recalled via the folder icon


### Querying
The search bar at the top allows Kibana uses Elasticsearch's support for Lucene Query String syntax. Let's say we're searching web server logs that have been parsed into a few fields.

We can of course do free text search. Find requests that contain the number 200, in any field.

```
200
```

Or we can search in a specific field. Find 200 only the the status field:

```
status:200
```

Find all 4xx status codes:

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

While lucene query syntax is simple and very powerful, Kibana also supports the full elasticsearch, JSON based, query DSL. See the Elasticsearch documentation for usage and examples.