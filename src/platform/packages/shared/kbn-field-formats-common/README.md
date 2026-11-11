# @kbn/field-formats-common

Common pieces shared by field formatters across Kibana.

This tiny package centralizes a few labels/tokens that are used consistently when formatting values in tables, charts, and other UI components.

## Exports

The package currently exposes the following constants from `./constants`:

- `EMPTY_LABEL` — i18n label for empty string values. Default: "(blank)"
- `NULL_LABEL` — i18n label for null values. Default: "(null)"
- `NULL_PLACEHOLDER` — dash shown in place of null values where a tooltip can carry the meaning. Value: `"-"`
- `NAN_LABEL` — string used to represent Not-a-Number. Value: `"NaN"`
- `MISSING_TOKEN` — internal token used to mark missing values in aggregations and formatting flows. Value: `"__missing__"`

It also exposes one predicate:

- `isMissingValue(value)` — true for a value that carries no data: `null`, `undefined`, or `MISSING_TOKEN`

## Usage

Import the constants and use them when rendering or formatting values so the UI stays consistent across apps and plugins.

```ts
import { EMPTY_LABEL, NULL_LABEL, NAN_LABEL, MISSING_TOKEN } from '@kbn/field-formats-common';

function renderCell(value: unknown) {
	if (value === null) return NULL_LABEL;
	if (value === '') return EMPTY_LABEL;
	if (Number.isNaN(value)) return NAN_LABEL;
	return String(value);
}

// Example: handling "missing" buckets from aggregations
function normalizeBucketKey(key: string | undefined) {
	return key === undefined ? MISSING_TOKEN : key;
}
```

## Notes

- `EMPTY_LABEL` and `NULL_LABEL` are i18n-aware strings; they should be used directly in UI output.
- `NULL_PLACEHOLDER` is a bare dash and carries no meaning on its own. Only use it where a tooltip can
  expose `NULL_LABEL` on hover, which is why charts keep `NULL_LABEL` while tables and Discover
  render the dash.
- `MISSING_TOKEN` is an internal sentinel value, not a user-facing label; prefer mapping it to a label (for example, `EMPTY_LABEL`) before rendering.
- Use `isMissingValue` rather than re-checking `value == null || value === MISSING_TOKEN`, so that
  rendering, copy-to-clipboard, and CSV export all agree on which values are missing.
- If you need to customize how special values are displayed, build that logic on top of these shared constants rather than re-defining literals.



