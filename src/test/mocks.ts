/* eslint-disable @typescript-eslint/no-empty-function */

const oraMock = {
  start: () => oraMock,
  succeed: () => jest.fn(),
  stop: () => jest.fn(),
  fail: () => jest.fn(),
  stopAndPersist: () => jest.fn(),
  set text(value: string) {},
};

export function mockOra() {
  const ora = jest.fn(() => oraMock);
  //@ts-expect-error
  ora.oraMock = oraMock;
  jest.mock('ora', () => ora);
}

export function getOraMock() {
  return oraMock;
}
