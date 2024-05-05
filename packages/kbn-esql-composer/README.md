# @kbn/esql-composer

`@kbn/esql-composer` is a library to generate ES|QL queries in a way that is similar to Observables. Its eventual goal is to be able to create fully typed queries (with autocomplete on column names et cetera).

Every query starts with a source command. Currently only `from` is available. Source commands return a `QueryPipeline`, which allows you to pipe the source data into other commands, and eventually get the ES|QL query as a raw string. Here's an example:

```ts
import { from, where, sort, keep, limit, SortOrder } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('@timestamp >= NOW() - 1 hour'),
    sort({ '@timestamp': SortOrder.Desc }),
    keep('service.name', 'log.level'),
    limit(10)
  )
  .asString();
```
