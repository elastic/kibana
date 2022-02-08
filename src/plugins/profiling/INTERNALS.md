This plugin is divided into two components: the UI and the server.

The UI is responsible for rendering the charts and flamegraphs. It will make
API calls to the server component depending on the user interactions with the
UI. You will find most of the source code in the `public` directory.

The server is responsible for retrieving data from the necessary sources and
sending it in the expected format to the UI in response to the UI's API calls.
You will find most of the source code in the `server` directory.

## Server API

Depending on how the plugin is configured, there are two different sets of API
calls.

If the server uses local fixtures as a data source, then the following API is
served by the server and called by the UI:

* /api/prodfiler/v1/topn/containers
* /api/prodfiler/v1/topn/deployments
* /api/prodfiler/v1/topn/hosts
* /api/prodfiler/v1/topn/threads
* /api/prodfiler/v1/topn/traces
* /api/prodfiler/v1/flamechart/elastic
* /api/prodfiler/v1/flamechart/pixi

If the server uses an Elasticsearch cluster as a data source, then the following
API is served by the server and called by the UI:

* /api/prodfiler/v2/topn/containers
* /api/prodfiler/v2/topn/deployments
* /api/prodfiler/v2/topn/hosts
* /api/prodfiler/v2/topn/threads
* /api/prodfiler/v2/topn/traces
* /api/prodfiler/v2/flamechart/elastic
* /api/prodfiler/v2/flamechart/pixi

By default, the plugin is configured to use the second API set. See README.md to
configure the plugin to use the first API set (aka local fixtures as a data
source).

Both API sets are expected to return the same response format.

The design to have separate API sets for local vs Elasticsearch was partly
because the UI and server components were originally developed separately and
later merged. However, it also allows the server methods to have a single
responsibility, making it easier to test and verify that the server returns
the expected responses for the given data sources.

## Server API Responses

### /api/prodfiler/*/flamechart/elastic

The response returned from this API is used by the Elastic flamegraph.

The following example is the expected response:

```json
{
  leaves: [
    {
      id: 'pf-collection-agent: runtime.releaseSudog() in runtime2.go#282',
      value: 1,
      depth: 19,
      pathFromRoot: {
        '0': 'root',
        '1': 'pf-collection-agent: runtime.goexit() in asm_amd64.s#1581',
        '2': 'pf-collection-agent: github.com/optimyze/prodfiler/pf-storage-backend/storagebackend/storagebackendv1.(*ScyllaExecutor).Start.func1 in scyllaexecutor.go#102',
        '3': 'pf-collection-agent: github.com/optimyze/prodfiler/pf-storage-backend/storagebackend/storagebackendv1.(*ScyllaExecutor).executeQueryAndReadResults in scyllaexecutor.go#158',
        '4': 'pf-collection-agent: github.com/gocql/gocql.(*Query).Iter in session.go#1246',
        '5': 'pf-collection-agent: github.com/gocql/gocql.(*Session).executeQuery in session.go#463',
        '6': 'pf-collection-agent: github.com/gocql/gocql.(*queryExecutor).executeQuery in query_executor.go#66',
        '7': 'pf-collection-agent: github.com/gocql/gocql.(*queryExecutor).do in query_executor.go#127',
        '8': 'pf-collection-agent: github.com/gocql/gocql.(*queryExecutor).attemptQuery in query_executor.go#32',
        '9': 'pf-collection-agent: github.com/gocql/gocql.(*Query).execute in session.go#1044',
        '10': 'pf-collection-agent: github.com/gocql/gocql.(*Conn).executeQuery in conn.go#1129',
        '11': 'pf-collection-agent: github.com/gocql/gocql.(*Conn).exec in conn.go#916',
        '12': 'pf-collection-agent: github.com/gocql/gocql.(*writeExecuteFrame).writeFrame in frame.go#1618',
        '13': 'pf-collection-agent: github.com/gocql/gocql.(*framer).writeExecuteFrame in frame.go#1643',
        '14': 'pf-collection-agent: github.com/gocql/gocql.(*framer).finishWrite in frame.go#788',
        '15': 'pf-collection-agent: github.com/gocql/gocql.(*Conn).Write in conn.go#319',
        '16': 'pf-collection-agent: github.com/gocql/gocql.(*writeCoalescer).Write in conn.go#829',
        '17': 'pf-collection-agent: sync.(*Cond).Wait in cond.go#83',
        '18': 'pf-collection-agent: sync.runtime_notifyListWait() in sema.go#498',
        '19': 'pf-collection-agent: runtime.releaseSudog() in runtime2.go#282',
      },
    },
    ...
  ]
}
```

Here is a basic description of the response format:

* Each object in the `leaves` list represents a leaf node in the flamegraph
* `id` represents the name of the flamegraph node
* `value` represents the number of samples for that node
* `depth` represents the depth of the node in the flamegraph, starting from zero
* `pathFromRoot` represents the full path from the flamegraph root to the given node

### /api/prodfiler/*/flamechart/pixi

The response returned from this API is used by the Pixi flamegraph.

The expected JSON response is the same format returned from `/api/v1/restricted/flamechart/$projectID/$timeStart/$timeStop`.
