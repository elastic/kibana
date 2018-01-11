import { canAppendWildcard } from '../can_append_wildcard';

describe('canAppendWildcard', () => {
  test('ignores no data', () => {
    expect(canAppendWildcard({})).toBeFalsy();
  });

  test('ignores symbols', () => {
    expect(canAppendWildcard('%')).toBeFalsy();
  });

  test('accepts numbers', () => {
    expect(canAppendWildcard('1')).toBeTruthy();
  });

  test('accepts letters', () => {
    expect(canAppendWildcard('b')).toBeTruthy();
  });

  test('accepts uppercase letters', () => {
    expect(canAppendWildcard('B')).toBeTruthy();
  });

  test('ignores if more than one key pressed', () => {
    expect(canAppendWildcard('ab')).toBeFalsy();
  });
});
