import oraOriginal from 'ora';

/* eslint-disable @typescript-eslint/no-empty-function */
const oraMock = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  start: (text?: string) => oraMock,
  succeed: () => {},
  stop: () => {},
  fail: () => {},
  stopAndPersist: () => {},
  set text(value: string) {},
};

export function ora(ci: boolean | undefined, text?: string | undefined) {
  return ci ? oraMock : oraOriginal({ text });
}
