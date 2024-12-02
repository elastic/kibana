# @kbn/saved-search-component

A component wrapper around Discover's Saved Search embeddable. This can be used in solutions without being within a Dasboard context.

This can be used to render a context-aware (logs etc) "document table". 

In the past you may have used the Log Stream Component to achieve this, this component supersedes that.

## Basic usage

```
import { LazySavedSearchComponent } from '@kbn/saved-search-component';

<LazySavedSearchComponent
    dependencies={{
        embeddable: dependencies.embeddable,
        savedSearch: dependencies.savedSearch,
        dataViews: dependencies.dataViews,
        searchSource: dependencies.searchSource,
    }}
    index={anIndexString}
    filters={optionalFilters}
    query={optionalQuery}
    timestampField={optionalTimestampFieldString}
/>
```