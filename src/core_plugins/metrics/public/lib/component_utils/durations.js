export const durationOutputOptions = [
  { label: 'milliseconds', value: 'ms' },
  { label: 'seconds', value: 's' },
  { label: 'minutes', value: 'm' },
  { label: 'hours', value: 'h' },
  { label: 'days', value: 'd' },
  { label: 'weeks', value: 'w' },
  { label: 'months', value: 'M' },
  { label: 'years', value: 'Y' }
];

export const durationInputOptions = [
  { label: 'picoseconds', value: 'ps' },
  { label: 'nanoseconds', value: 'ns' },
  { label: 'microseconds', value: 'us' },
  ...durationOutputOptions
];

