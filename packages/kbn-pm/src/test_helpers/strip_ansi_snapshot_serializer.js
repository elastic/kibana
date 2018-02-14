import hasAnsi from 'has-ansi';
import stripAnsi from 'strip-ansi';

export const stripAnsiSnapshotSerializer = {
  print: (value, serialize) => {
    return serialize(stripAnsi(value));
  },

  test: value => {
    return typeof value === 'string' && hasAnsi(value);
  },
};
