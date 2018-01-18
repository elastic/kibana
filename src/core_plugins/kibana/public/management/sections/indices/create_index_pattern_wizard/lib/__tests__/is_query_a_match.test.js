import { isQueryAMatch } from '../is_query_a_match';

describe('isQueryAMatch', () => {
  it('should handle straight up matches', () => {
    expect(isQueryAMatch('kibana', 'kibana')).toBeTruthy();
  });

  it('should handle wildcards at the end', () => {
    expect(isQueryAMatch('ki*', 'kibana')).toBeTruthy();
  });

  it('should handle wildcards in the beginning', () => {
    expect(isQueryAMatch('*ki*', 'kibana')).toBeTruthy();
  });

  it('should handle wildcards in the middle', () => {
    expect(isQueryAMatch('k*b*', 'kibana')).toBeTruthy();
  });

  it('should handle wildcards in the middle but not at the end', () => {
    expect(isQueryAMatch('k*b', 'kibana')).toBeFalsy();
  });

  it('should handle no matches', () => {
    expect(isQueryAMatch('k*b*', 'es')).toBeFalsy();
  });

  it('should support a generic wildcard', () => {
    expect(isQueryAMatch('*', 'es')).toBeTruthy();
  });
});
