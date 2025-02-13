# @kbn/rrule

A rewrite of [rrule.js](https://github.com/jakubroztocil/rrule) using `moment-timezone` for timezone support. Ensures that we always get the same outputs no matter what local timezone the executing system is set to.

Differences from library on Github:

- It is **recommended** to generate input Dates from UTC timestamps, but not required. This implementation will perform calculations on inputted Dates accurate to their corresponding Unix timestamps.
- Timezones IDs are required. They're very important for dealing with things like day-of-week changes or DST.
- `inc` argument from `between`, `before`, `after` is removed, and is computed as if it were `true`
- SECONDLY frequency is not implemented.
- This implementation may not accurately support the entire [iCalendar RRULE RFC](https://www.rfc-editor.org/rfc/rfc5545). It is known to work for common scenarios configurable in the Recurrence Scheduler UI, plus some other more complicated ones. See `rrule.test.ts` for known working configurations.

Known not to work are mostly edge cases:

- Manually configuring `setpos` with any frequency besides `MONTHLY`
- `wkst` doesn't seem to have an effect on anything (I was also unable to get it to affect anything in the original library though)
- Setting `byyearday` on anything besides `Frequency.YEARLY`, setting `bymonthday` on anything besides `MONTHLY`, and other similar odd situations

## Constructor

Create an RRule with the following options:

```ts
new RRule({
  dtstart: Date; // Recommended to generate this from a UTC timestamp, but this impl
  tzid: string; // Takes a Moment.js timezone string. Recommended to use a country and city for DST accuracy, e.g. America/Phoenix and America/Denver are both in Mountain time but Phoenix doesn't observe DST
  freq?: Frequency; // Defaults to YEARLY
  interval?: number; // Every x freq, e.g. 1 and YEARLY is every 1 year, 2 and WEEKLY is every 2 weeks
  until?: Date; // Recur until this date
  count?: number; // Number of times this rule should recur until it stops
  wkst?: Weekday | number; // Start of week, defaults to Monday
  // The following, if not provided, will be automatically derived from the dtstart
  byweekday?: Weekday[] | string[]; // Day(s) of the week to recur, OR nth-day-of-month strings, e.g. "+2TU" second Tuesday of month, "-1FR" last Friday of the month, which will get internally converted to a byweekday/bysetpos combination
  bysetpos?: number[]; // Positive or negative integer affecting nth day of the month, eg -2 combined with byweekday of FR is 2nd to last Friday of the month. Best not to set this manually and just use byweekday.
  byyearday?: number[]; // Day(s) of the year that this rule should recur, e.g. 32 is Feb 1. Respects leap years.
  bymonth?: number[]; // Month(s) of the year that this rule should recur
  bymonthday?: number[]; // Day(s) of the momth to recur
  byhour?: number[]; // Hour(s) of the day to recur
  byminute?: number[]; // Minute(s) of the hour to recur
  bysecond?: number[]; // Seconds(s) of the day to recur
});
```

## Methods

### `RRule.prototype.all(limit?: number)`

returns `Date[] & { hasMore?: boolean}`

Returns an array all dates matching the rule. By default, limited to 10000 iterations. Pass something to `limit` to change this.

If it hits the limit, the array will come back with the property `hasMore: true`.

### `RRule.prototype.before(dt: Date)`

returns `Date | null`

Returns the last recurrence before `dt`, or `null` if there is none.

### RRule.prototype.after(dt: Date)`

returns `Date | null`

Returns the last recurrence after `dt`, or `null` if there is none.

### RRule.prototype.between(start: Date, end: Date)`

returns `Date[]`

Returns an array of all dates between `start` and `end`.
