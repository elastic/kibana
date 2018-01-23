import { isIndexPatternQueryValid } from '../is_index_pattern_query_valid';

describe('isIndexPatternQueryValid', () => {
  it('should fail with illegal characters', () => {
    const valid = isIndexPatternQueryValid('abc', ['a']);
    expect(valid).toBeFalsy();
  });

  it('should pass with no illegal characters', () => {
    const valid = isIndexPatternQueryValid('abc', ['%']);
    expect(valid).toBeTruthy();
  });

  it('should fail if the pattern starts with a single dot', () => {
    const valid = isIndexPatternQueryValid('.');
    expect(valid).toBeFalsy();
  });

  it('should fail if the pattern starts with a double dot', () => {
    const valid = isIndexPatternQueryValid('..');
    expect(valid).toBeFalsy();
  });

  it('should fail if no pattern is passed in', () => {
    const valid = isIndexPatternQueryValid(null);
    expect(valid).toBeFalsy();
  });

  it('should fail if an empty pattern is passed in', () => {
    const valid = isIndexPatternQueryValid('');
    expect(valid).toBeFalsy();
  });
});
