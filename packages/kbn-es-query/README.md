# kbn-es-query

This module is responsible for generating Elasticsearch queries for Kibana. See explanations below for each of the subdirectories.

## es_query

This folder contains the code that combines Lucene/KQL queries and filters into an Elasticsearch query.

```javascript
buildEsQuery(indexPattern, queries, filters, config)
```

Generates the Elasticsearch query DSL from combining the queries and filters provided.

```javascript
buildQueryFromFilters(filters, indexPattern)
```

Generates the Elasticsearch query DSL from the given filters.

```javascript
luceneStringToDsl(query)
```

Generates the Elasticsearch query DSL from the given Lucene query.

```javascript
migrateFilter(filter, indexPattern)
```

Migrates a filter from a previous version of Elasticsearch to the current version.

```javascript
decorateQuery(query, queryStringOptions)
```

Decorates an Elasticsearch query_string query with the given options.

## filters

This folder contains the code related to Kibana Filter objects, including their definitions, and helper functions to create them. Filters in Kibana always contain a `meta` property which describes which `index` the filter corresponds to, as well as additional data about the specific filter.

The object that is created by each of the following functions corresponds to a Filter object in the `lib` directory (e.g. `PhraseFilter`, `RangeFilter`, etc.)

```javascript
buildExistsFilter(field, indexPattern)
```

Creates a filter (`ExistsFilter`) where the given field exists.

```javascript
buildPhraseFilter(field, value, indexPattern)
```

Creates an filter (`PhraseFilter`) where the given field matches the given value.

```javascript
buildPhrasesFilter(field, params, indexPattern)
```

Creates a filter (`PhrasesFilter`) where the given field matches one or more of the given values. `params` should be an array of values. 

```javascript
buildQueryFilter(query, index)
```

Creates a filter (`CustomFilter`) corresponding to a raw Elasticsearch query DSL object.

```javascript
buildRangeFilter(field, params, indexPattern)
```

Creates a filter (`RangeFilter`) where the value for the given field is in the given range. `params` should contain `lt`, `lte`, `gt`, and/or `gte`.

## kuery

This folder contains the code corresponding to generating Elasticsearch queries using the Kibana query language.

In general, you will only need to worry about the following functions from the `ast` folder:

```javascript
fromExpression(expression)
```

Generates an abstract syntax tree corresponding to the raw Kibana query `expression`. 

```javascript
toElasticsearchQuery(node, indexPattern)
```

Takes an abstract syntax tree (generated from the previous method) and generates the Elasticsearch query DSL using the given `indexPattern`. Note that if no `indexPattern` is provided, then an Elasticsearch query DSL will still be generated, ignoring things like the index pattern scripted fields, field types, etc.

