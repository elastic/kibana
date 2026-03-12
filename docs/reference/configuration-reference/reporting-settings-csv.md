---
navigation_title: "CSV settings"
applies_to:
  deployment:
    ess: all
    self: all
---

# CSV settings [reporting-csv-settings]

::::{note}
We recommend using CSV reports to export moderate amounts of data only. The feature enables analysis of data in external tools, but it is not intended for bulk export or to backup Elasticsearch data. Report timeout and incomplete data issues are likely if you are exporting data where:

* More than 250 MB of data is being exported
* Data is stored on slow storage tiers
* Any shard needed for the search is unavailable
* Network latency between nodes is high
* Cross-cluster search is used
* ES|QL is used and result row count exceeds the limits of ES|QL queries

To work around the limitations, use filters to create multiple smaller reports, or extract the data you need directly with the Elasticsearch APIs.

For more information on using Elasticsearch APIs directly, see [Scroll API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll), [Point in time API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time), [ES|QL](docs-content://explore-analyze/query-filter/languages/esql-rest.md) or [SQL](docs-content://explore-analyze/query-filter/languages/sql-rest-format.md#_csv) with CSV response data format. We recommend that you use an official Elastic language client: details for each programming language library that Elastic provides are in the [{{es}} Client documentation](https://www.elastic.co/guide/en/elasticsearch/client/index.html).

Reporting parameters can be adjusted to overcome some of these limiting scenarios. Results are dependent on data size, availability, and latency factors and are not guaranteed.

::::

`xpack.reporting.csv.maxConcurrentShardRequests` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Sets the maximum number of concurrent shard requests that each sub-search request executes per node during Kibana CSV export. Defaults to `5`. This setting is available in 8.12.0 and later versions in {{ecloud}}.
% TBD: Is this setting applicable only to Elastic Cloud?

$$$xpack-reporting-csv$$$ `xpack.reporting.csv.maxSizeBytes` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The maximum [byte size](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#byte-units) of a CSV file before being truncated. This setting exists to prevent large exports from causing performance and storage issues. Can be specified as a number of bytes. Defaults to `250mb`.

`xpack.reporting.csv.scroll.size`
:   Number of documents retrieved from {{es}} for each scroll iteration during a CSV export. The maximum value is `10000`. Defaults to `500`.

::::{note}
You may need to lower this setting if the default number of documents creates a strain on network resources.

::::


`xpack.reporting.csv.scroll.duration`
:   Amount of [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) allowed before {{kib}} cleans the scroll context during a CSV export. Valid option is either `auto` or [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units), Defaults to `30s`.

::::{note}
If search latency in {{es}} is sufficiently high, such as if you are using {{ccs}}, you may either need to increase the time setting or set this config value to `auto`. When the config value is set to `auto` the scroll context will be preserved for as long as possible, before the report task is terminated due to the limits of `xpack.reporting.queue.timeout`.

::::


`xpack.reporting.csv.scroll.strategy`
:   Choose the API method used to page through data during CSV export. Valid options are `scroll` and `pit`. Defaults to `pit`.

::::{note}
Each method has its own unique limitations which are important to understand.

* Scroll API: Search is limited to 500 shards at the very most. In cases where data shards are unavailable or time out, the export may return partial data.
* PIT API: Permissions to read data aliases alone will not work: the permissions are needed on the underlying indices or datastreams. In cases where data shards are unavailable or time out, the export will be empty rather than returning partial data.

::::


`xpack.reporting.csv.checkForFormulas`
:   Enables a check that warns you when there’s a potential formula included in the output (=, -, +, and @ chars). See OWASP: [https://www.owasp.org/index.php/CSV_Injection](https://www.owasp.org/index.php/CSV_Injection). Defaults to `true`.

`xpack.reporting.csv.escapeFormulaValues`
:   Escape formula values in cells with a `'`. See OWASP: [https://www.owasp.org/index.php/CSV_Injection](https://www.owasp.org/index.php/CSV_Injection). Defaults to `true`.

`xpack.reporting.csv.useByteOrderMarkEncoding`
:   Adds a byte order mark (`\ufeff`) at the beginning of the CSV file. Defaults to `false`.

`xpack.reporting.csv.maxRows` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.3`
:    The maximum number of rows in a CSV report. Reports longer than the maximum limit will be truncated. The default is 10,000. The minimum is 1.


