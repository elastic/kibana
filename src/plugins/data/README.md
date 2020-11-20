# data

The data plugin provides common data access services, such as `search` and `query`, for solutions and application developers.

## Autocomplete

The autocomplete service provides suggestions for field names and values.

It is wired into the `TopNavMenu` component, but can be used independently.

### Fetch Query Suggestions

The `getQuerySuggestions` function helps to construct a query. 
KQL suggestion functions are registered in X-Pack, so this API does not return results in OSS.

```.ts

    // `inputValue` is the user input
    const querySuggestions = await autocomplete.getQuerySuggestions({
        language: 'kuery',
        indexPatterns: [indexPattern],
        query: inputValue,
    });

```

### Fetch Value Suggestions

The `getValueSuggestions` function returns suggestions for field values.
This is helpful when you want to provide a user with options, for example when constructing a filter. 

```.ts

    // `inputValue` is the user input
    const valueSuggestions = await autocomplete.getValueSuggestions({
      indexPattern,
      field,
      query: inputValue,
    });

```

## Field Formats

Coming soon.

## Index Patterns

Coming soon.

### Index Patterns HTTP API

Index patterns provide Rest-like HTTP CRUD+ API with the following endpoints:

- Create an index pattern &mdash; `POST /api/index_patterns/index_pattern`
- Fetch an index pattern by `{id}` &mdash; `GET /api/index_patterns/index_pattern/{id}`
- Delete an index pattern by `{id}` &mdash; `DELETE /api/index_patterns/index_pattern/{id}`
- Partially update an index pattern by `{id}` &mdash; `POST /api/index_patterns/index_pattern/{id}`
  - `title`
  - `timeFieldName`
  - `intervalName`
  - `fields`
    - Optionally refresh fields.
  - `sourceFilters`
  - `fieldFormatMap`
  - `type`
  - `typeMeta`
- Fields API
  - Create a field &mdash; `POST /api/index_patterns/index_pattern/{id}/field`
  - Upsert a field &mdash; `PUT /api/index_patterns/index_pattern/{id}/field`
  - Fetch a field &mdash; `GET /api/index_patterns/index_pattern/{id}/field/{name}`
  - Update a an existing field &mdash; `POST /api/index_patterns/index_pattern/{id}/field/{name}`
  - Remove a field &mdash; `DELETE /api/index_patterns/index_pattern/{id}/field/{name}`

#### Create an index pattern

Create an index pattern with a custom title.

```
POST /api/index_patterns/index_pattern
{
    "index_pattern": {
        "title": "hello"
    }
}
```

Customize creation behavior with:

- `override` --- if set to `true`, replaces an existing index pattern if an
  index pattern with the provided title already exists. Defaults to `false`.
- `skip_field_refresh` --- if set to `true` skips reloading index pattern fields after
  the index pattern is stored. Defaults to `false`.
- `make_default` --- if set to `true`, makes the new index pattern the default
  index pattern. Defaults to `true`.

```
POST /api/index_patterns/index_pattern
{
    "override": false,
    "skip_field_refresh": false,
    "make_default": true,
    "index_pattern": {
        "title": "hello"
    }
}
```

At creation all index pattern fields are option and you can provide them.

```
POST /api/index_patterns/index_pattern
{
    "index_pattern": {
        "id": "...",
        "version": "...",
        "title": "...",
        "type": "...",
        "intervalName": "...",
        "timeFieldName": "...",
        "sourceFilters": [],
        "fields": {},
        "typeMeta": {},
        "fieldFormats": {},
        "fieldAttrs": {}
    }
}
```

The endpoint returns the created index pattern object.

```json
{
    "index_pattern": {}
}
```


### Fetch an index pattern by ID

Retrieve and index pattern by its ID.

```
GET /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Returns an index pattern object.

```json
{
    "index_pattern": {
        "id": "...",
        "version": "...",
        "title": "...",
        "type": "...",
        "intervalName": "...",
        "timeFieldName": "...",
        "sourceFilters": [],
        "fields": {},
        "typeMeta": {},
        "fieldFormats": {},
        "fieldAttrs": {}
    }
}
```


### Delete an index pattern by ID

Delete and index pattern by its ID.

```
DELETE /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Returns an '200 OK` response with empty body on success.


### Partially update an index pattern by ID

Update part of an index pattern. Only provided fields will be updated on the
index pattern, missing fields will stay as they are persisted.

Update a title of an index pattern.

```
POST /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
{
    "index_pattern": {
        "title": "new_title"
    }
}
```

All update fields are optional, you can specify the following fields.

```
POST /api/index_patterns/index_pattern
{
    "index_pattern": {
        "title": "...",
        "timeFieldName": "...",
        "intervalName": "...",
        "sourceFilters": [],
        "fieldFormats": {},
        "type": "...",
        "typeMeta": {},
        "fields": {}
    }
}
```

When you are updating fields, you can skip field refresh using `skip_field_refresh` flag.

```
POST /api/index_patterns/index_pattern
{
    "skip_field_refresh": true,
    "index_pattern": {
        "fields": {}
    }
}
```

This endpoint returns the updated index pattern object.

```json
{
    "index_pattern": {

    }
}
```


### Fields API

Fields allows you to manage fields of an existing index pattern.

#### Create a field

Create a field by simply specifying its name, will default to `string` type. Returns
an error if a field with the provided name already exists.

```
POST /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/field
{
    "field": {
        "name": "my_field"
    }
}
```

Create a field by specifying all field properties.

```
POST /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/field
{
    "field": {
        "name": "",
        "type": "",
        "searchable": false,
        "aggregatable": false,
        "count": 0,
        "script": "",
        "scripted": false,
        "lang": "",
        "conflictDescriptions": {},
        "format": {},
        "esTypes": [],
        "readFromDocValues": false,
        "subType": {},
        "indexed": false,
        "customLabel": "",
        "shortDotsEnable": false
    }
}
```

#### Upsert a field

Creates a new field or updates an existing one, if one already exists with the same name.

Create a field by simply specifying its name.

```
PUT /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/field
{
    "field": {
        "name": "my_field"
    }
}
```

Create a field by specifying all field properties.

```
PUT /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/field
{
    "field": {
        "name": "",
        "type": "",
        "searchable": false,
        "aggregatable": false,
        "count": 0,
        "script": "",
        "scripted": false,
        "lang": "",
        "conflictDescriptions": {},
        "format": {},
        "esTypes": [],
        "readFromDocValues": false,
        "subType": {},
        "indexed": false,
        "customLabel": "",
        "shortDotsEnable": false
    }
}
```

#### Fetch a field

Fetch an existing index pattern field by field name.

```
GET /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/field/<name>
```

Returns the field object.

```json
{
    "field": {}
}
```

#### Delete a field

Delete a field of an index pattern.

```
DELETE /api/index_patterns/index_pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/field/<name>
```


## Query

The query service is responsible for managing the configuration of a search query (`QueryState`): filters, time range, query string, and settings such as the auto refresh behavior and saved queries.

It contains sub-services for each of those configurations:
 - `data.query.filterManager` - Manages the `filters` component of a `QueryState`. The global filter state (filters that are persisted between applications) are owned by this service.
 - `data.query.timefilter` - Responsible for the time range filter and the auto refresh behavior settings.
 - `data.query.queryString` - Responsible for the query string and query language settings.
 - `data.query.savedQueries` - Responsible for persisting a `QueryState` into a `SavedObject`, so it can be restored and used by other applications.

 Any changes to the `QueryState` are published on the `data.query.state$`, which is useful when wanting to persist global state or run a search upon data changes.

 A simple use case is:

 ```.ts
 function searchOnChange(indexPattern: IndexPattern, aggConfigs: AggConfigs) {
    data.query.state$.subscribe(() => {

        // Constuct the query portion of the search request
        const query = data.query.getEsQuery(indexPattern);
        
        // Construct a request
        const request = {
            params: {
                index: indexPattern.title,
                body: {
                    aggs: aggConfigs.toDsl(),
                    query,
                },
            },
        };

        // Search with the `data.query` config
        const search$ = data.search.search(request);

        ...
    });
 }

 ```

## Search

Provides access to Elasticsearch using the high-level `SearchSource` API or low-level `Search Strategies`.

### SearchSource

The `SearchSource` API is a convenient way to construct and run an Elasticsearch search query.

```.tsx

    const searchSource = await data.search.searchSource.create();
    const searchResponse = await searchSource
      .setParent(undefined)
      .setField('index', indexPattern)
      .setField('filter', filters)
      .fetch();

```

### Low-level search

#### Default Search Strategy

One benefit of using the low-level search API, is partial response support in X-Pack, allowing for a better and more responsive user experience.
In OSS only the final result is returned. 

```.ts
    import { isCompleteResponse } from '../plugins/data/public';

    const search$ = data.search.search(request)
        .subscribe({
        next: (response) => {
            if (isCompleteResponse(response)) {
                // Final result
                search$.unsubscribe();
            } else {
                // Partial result - you can update the UI, but data is still loading
            }
        },
        error: (e: Error) => {
            // Show customized toast notifications. 
            // You may choose to handle errors differently if you prefer. 
            data.search.showError(e);
        },
    });
```
