# @kbn/reporting-common

Removes any circular dependency from the reporting plugin and the @kbn/generate-csv package. 

This package includes the `CancellationToken` class, schema utils, constants, errors that extend `ReportingError`, and metrics such as `TaskRunResult`.  This package is shared-common vs specifically server or browser. The `@kbn/reporting-server` package has the server side helpers.