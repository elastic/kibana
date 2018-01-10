import { canAppendWildcard } from '../can_append_wildcard';

describe('canAppendWildcard', () => {
  test('ignores no data', () => {
    expect(canAppendWildcard({})).toBeFalsy();
  });

  test('ignores symbols', () => {
    expect(canAppendWildcard({ data: '%' })).toBeFalsy();
  });

  test('accepts numbers', () => {
    expect(canAppendWildcard({ data: '1' })).toBeTruthy();
  });

  test('accepts letters', () => {
    expect(canAppendWildcard({ data: 'b' })).toBeTruthy();
  });

  test('accepts uppercase letters', () => {
    expect(canAppendWildcard({ data: 'B' })).toBeTruthy();
  });

  test('ignores if more than one key pressed', () => {
    expect(canAppendWildcard({ data: 'ab' })).toBeFalsy();
  });
});
