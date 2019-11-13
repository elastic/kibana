### What happens when a user installs a sample data set?
1) Kibana deletes existing Elastic search indicies for the sample data set if they exist from previous installs.
2) Kibana creates Elasticsearch indicies with the provided field mappings.
3) Kibana uses bulk insert to ingest the new-line delimited json into the Elasticsearch index. Kibana migrates timestamps provided in new-line delimited json to the current time frame for any date field defined in `timeFields`
4) Kibana will install all saved objects for sample data set. This will override any saved objects previouslly installed for sample data set.

Elasticsearch index names are prefixed with `kibana_sample_data_`. For more details see [createIndexName](/src/legacy/server/sample_data/routes/lib/create_index_name.js)

Sample data sets typically provide data that spans 5 weeks from the past and 5 weeks into the future so users see data relative to `now` for a few weeks after installing sample data sets.

### Adding new sample data sets
Use [existing sample data sets](/src/legacy/server/sample_data/data_sets) as examples.
To avoid bloating the Kibana distribution, keep data set size to a minimum.

Follow the steps below to add new Sample data sets to Kibana.
1) Create new-line delimited json containing sample data.
2) Create file with Elasticsearch field mappings for sample data indices.
3) Create Kibana saved objects for sample data including index-patterns, visualizations, and dashboards. The best way to extract the saved objects is from the Kibana management -> saved objects [export UI](https://www.elastic.co/guide/en/kibana/current/managing-saved-objects.html#_export)
4) Define sample data spec conforming to [Data Set Schema](/src/legacy/server/sample_data/data_set_schema.js).
5) Register sample data by calling `server.registerSampleDataset(yourSpecProvider)` where `yourSpecProvider` is a function that returns an object containing your sample data spec from step 4.
