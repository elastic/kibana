import { isQueryAMatch } from '../is_query_a_match';

describe('isQueryAMatch', () => {
  describe('returns true', () => {
    it('for an exact match', () => {
      expect(isQueryAMatch('kibana', 'kibana')).toBeTruthy();
    });

    it('for a pattern with a trailing wildcard', () => {
      expect(isQueryAMatch('ki*', 'kibana')).toBeTruthy();
    });

    it('for a pattern with a leading wildcard', () => {
      expect(isQueryAMatch('*ki*', 'kibana')).toBeTruthy();
    });

    it('for a pattern with a middle and trailing wildcard', () => {
      expect(isQueryAMatch('k*b*', 'kibana')).toBeTruthy();
    });

    it('for a pattern that is only a wildcard', () => {
      expect(isQueryAMatch('*', 'es')).toBeTruthy();
    });

    it('for a pattern that contains commas', () => {
      expect(isQueryAMatch('cluster_one:kibana,cluster_two:kibana', 'cluster_one:kibana')).toBeTruthy();
      expect(isQueryAMatch('cluster_one:k*,cluster_two:kibana', 'cluster_one:kibana')).toBeTruthy();
    });
  });

  describe('returns false', () => {
    it('for a pattern with a middle wildcard only and is not an exact match', () => {
      expect(isQueryAMatch('k*b', 'kibana')).toBeFalsy();
    });

    it('for a pattern with wildcards but does not remotely match', () => {
      expect(isQueryAMatch('k*b*', 'es')).toBeFalsy();
    });

    it('for a pattern that contains commas but is not a CCS query', () => {
      expect(isQueryAMatch('kibana,es', 'kibana')).toBeFalsy();
    });
  });
});
