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

The above example will output

```sql
FROM logs-*
  | WHERE @timestamp >= NOW() - 1 hour
  | SORT @timestamp DESC
  | KEEP service.name, log.level
  | LIMIT 10
```

## Output formats

`asString()` – outputs the ES|QL query as a readable string.

`asRequest()` – outputs an object suitable for Elasticsearch’s ES|QL query API, including parameters.

## Features and examples

### `WHERE`

#### Basic `WHERE` clause

```ts

import { from, where } from '@kbn/esql-composer';

from('logs-*')
  .pipe(where('@timestamp <= NOW() AND @timestamp > NOW() - 24 hours'))
  .asString();
```

output: 

```sql
FROM logs-*
  | WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours
```

#### `WHERE` with named parameters

```ts
import { from, where } from '@kbn/esql-composer';

from('logs-*')
  .pipe(where('host.name == ?hostName AND service.name == ?serviceName', 
    {
      hostName: 'host1',
      serviceName: 'opbeans'
    }
  ))
  .asRequest();
```

The example above will create the following object
```ts
{ 
  query: `FROM logs-*
  | WHERE host.name == ?hostName AND service.name == ?serviceName AND service.name == ?hostName
  `,
  params: [{ hostName: 'host' }, { serviceName: 'service' }]
}

```

#### `WHERE` with positional parameters

```ts
import { from, where } from '@kbn/esql-composer';

from('logs-*')
  .pipe(where('host.name IN (?,?,?)', ['host1', 'host2', 'host3']))
  .asRequest();
```

The example above will create the following request
```ts
{ 
  query: `FROM logs-*
  | WHERE host.name IN (?,?,?)
  `,
  params: ['host1', 'host2', 'host3']
}

```

### `STATS`

Basic `STATS` clause


```ts
import { from, stats } from '@kbn/esql-composer';

from('logs-*')
  .pipe(stats('avg_duration = AVG(transaction.duration.us) BY service.name'))
  .asRequest();

```

`STATS`  also supports named parameters for dynamic field names

```ts
import { from, stats } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    stats('AVG(??duration), COUNT(??svcName) WHERE agent.name == "java" BY ??env', {
      duration: 'transaction.duration.us',
      svcName: 'service.name',
      env: 'service.environment',
    })
  )
  .asRequest();
```

Returns

```ts
{ 
  query: `FROM logs-*
  | AVG(??duration), COUNT(??svcName) WHERE agent.name == "java" BY ??env`,
  params: [
    {
      duration: 'transaction.duration.us',
    },
    {
      svcName: 'service.name',
    },
    {
      env: 'service.environment',
    },
  ]
}
```

### `EVAL`

Basic `EVAL` clause

```ts
import { from, evaluate } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    evaluate('type = CASE(languages <= 1, "monolingual",languages <= 2, "bilingual","polyglot")')
  )
  .asString();

```

`EVAL`  also supports named parameters for dynamic field names

```ts
import { from, evaluate } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    evaluate('latestTs = MAX(??ts)', {
      ts: '@timestamp',
    })
  )
  .asRequest();
```

```ts
{ 
  query: `FROM logs-*
  | EVAL latestTs = MAX(??ts)`,
  params: [
    {
      ts: '@timestamp',
    }
  ]
}
```


### `SORT`


`SORT` by string fields (ASC by default)

```ts
import { from, sort } from '@kbn/esql-composer';

from('logs-*')
  .pipe(sort('@timestamp', 'log.level'))
  .asString();
```

`SORT` with explicit order

```ts

import { from, evaluate } from '@kbn/esql-composer';

from('logs-*')
  .pipe(sort({ '@timestamp': SortOrder.Desc }))
  .asString();
```


`SORT` with named parameters

```ts
import { from, sortRaw } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    sortRaw('??timestamp DESC, ??logLevel ASC', {
      timestamp: '@timestamp',
      logLevel: 'log.level',
    })
  )
  .asRequest();
```

Returns
 
```ts
{
  query: `FROM logs-*
  | SORT ??timestamp DESC, ??logLevel ASC`,
  params: [
    { timestamp: '@timestamp' },
    { logLevel: 'log.level' }
  ]
}
```