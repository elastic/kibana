import hasAnsi from 'has-ansi';
import stripAnsi from 'strip-ansi';

export const stripAnsiSnapshotSerializer = {
  print(value: string, serialize: (val: string) => string) {
    return serialize(stripAnsi(value));
  },

  test(value: any) {
    return typeof value === 'string' && hasAnsi(value);
  },
};
