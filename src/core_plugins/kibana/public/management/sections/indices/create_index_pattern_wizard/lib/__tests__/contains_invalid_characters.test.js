import { containsInvalidCharacters } from '../contains_invalid_characters';

describe('containsInvalidCharacters', () => {
  it('should fail with illegal characters', () => {
    const valid = containsInvalidCharacters('abc', ['a']);
    expect(valid).toBeFalsy();
  });

  it('should pass with no illegal characters', () => {
    const valid = containsInvalidCharacters('abc', ['%']);
    expect(valid).toBeTruthy();
  });
});
