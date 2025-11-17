# @kbn/superdatepicker

This package is a wrapper around `EuiSuperDatePicker`.

## Entire time range

To enable this funcionality set `enableEntireTimeRange` to `true`. This will add a button under commonly used ranges panel. If `http` service is passed down and `dataView` exists, a query will be executed to retrieve the `start` and `end` ranges for given data view and they will be set as current time range.
