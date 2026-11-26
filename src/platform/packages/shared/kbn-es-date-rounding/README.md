# @kbn/es-date-rounding

Client-side copy of how Elasticsearch rounds timestamps into date buckets in a time zone. Elasticsearch uses the same rounding for the `date_histogram` aggregation and for ES|QL `BUCKET` / `TBUCKET`. Use this package when Kibana needs bucket boundaries without asking Elasticsearch, for example to build a chart's time axis or to drop partial buckets.

## Usage

```ts
import {
  ianaTimeZoneOrUtc,
  nextBucketKey,
  roundToBucketKey,
  toDateRounding,
} from '@kbn/es-date-rounding';

const rounding = toDateRounding('12h'); // undefined for unsupported intervals
const timeZone = ianaTimeZoneOrUtc(uiSettings.get('dateFormat:tz'));

if (rounding) {
  const key = roundToBucketKey(timestamp, rounding, timeZone); // bucket containing `timestamp`
  const next = nextBucketKey(timestamp, rounding, timeZone); // the bucket after it
}
```

## Rounding rules

`toDateRounding` parses `<amount><unit>` with `ms`, `s`, `m`, `h`, `d`, `w`, `M` or `y`, using ES|QL `BUCKET` semantics:

- `ms`, `s`, `m` and `h` are fixed widths, aligned to multiples of the width in local time.
- `1d` and `1w` are calendar units: local midnight and ISO weeks starting on Monday. `7d` is rounded like `1w`. Other day and week multiples are fixed widths.
- Months and years are calendar units. Multiples such as `3M` or `2y` are counted from January of year 1, not from the Unix epoch, so `2y` buckets start on odd years.

The `date_histogram` aggregation rounds the same way, but an interval string alone doesn't say which rounding it gets. In ES|QL the unit decides; in DSL the parameter it goes into decides. `toDateRounding` always follows ES|QL:

| Interval | ES\|QL `BUCKET` and `toDateRounding` | DSL `date_histogram` |
| --- | --- | --- |
| `1d` | Calendar day | `calendar_interval: 1d` is a calendar day; `fixed_interval: 1d` is a fixed 24-hour width |
| `3M` | Three calendar months, counted from January of year 1 | Not accepted: `calendar_interval` only takes single units such as `1M` |

So for a DSL interval, build the `DateRounding` from the parameter instead of calling `toDateRounding`. For example, use `{ kind: 'calendar', unit: 'day', amount: 1 }` for `calendar_interval: 1d` and `{ kind: 'fixed', widthMs: 86_400_000 }` for `fixed_interval: 1d`. `DateRounding` covers `fixed_interval` in `ms`, `s`, `m`, `h` or `d` and `calendar_interval` of `1d`, `1w` or `1M`. It has no calendar minute or hour, so don't substitute a fixed width for `calendar_interval: 1m` or `1h` and expect the same bucket keys.

Daylight saving changes follow Elasticsearch:

- When clocks go back, the repeated hour gets its own fixed-width buckets, and the bucket that spans the change is longer (a `12h` bucket can last 13 hours).
- When clocks go forward, a bucket whose local start is skipped starts at the transition instant, and the bucket that spans the change is shorter.
- When local midnight is skipped, the day starts at the transition instant.

## Time zones

The rounding functions take a branded `IanaTimeZone`. Use `ianaTimeZoneOrUtc` for untrusted input such as `dateFormat:tz`: it maps Kibana's `Browser` value to the browser's zone, and empty or unknown ids to UTC. `ianaTimeZone` throws instead.

## Tests

Unit tests live next to the source. The Scout API spec `src/platform/plugins/shared/data/test/scout/api/tests/date_rounding_bucket_keys.spec.ts` compares the bucket keys with real ES|QL `BUCKET` results across DST changes, so run it after changing the rounding rules.
