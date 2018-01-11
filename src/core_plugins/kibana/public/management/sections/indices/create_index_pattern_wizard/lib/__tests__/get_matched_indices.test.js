import { getMatchedIndices } from '../get_matched_indices';

jest.mock('../../constants', () => ({
  MAX_NUMBER_OF_MATCHING_INDICES: 5,
}));

describe('getMatchedIndices', () => {
  it('should return exact matches if they exist', () => {
    const indices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' }
    ];

    const query = 'kibana';
    const matchedIndices = [
      { name: '.kibana' },
      { name: 'kibana' },
    ];

    const result = getMatchedIndices(indices, matchedIndices, query, false);

    expect(result).toEqual({
      allIndices: [{ name: 'kibana' }, { name: 'es' }],
      exactMatchedIndices: [{ name: 'kibana' }],
      partialMatchedIndices: [{ name: 'kibana' }],
      visibleIndices: [{ name: 'kibana' }]
    });
  });

  it('should support queries with wildcards', () => {
    const indices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' }
    ];

    const query = 'ki*';
    const matchedIndices = [
      { name: '.kibana' },
      { name: 'kibana' },
    ];

    const result = getMatchedIndices(indices, matchedIndices, query, false);

    expect(result).toEqual({
      allIndices: [{ name: 'kibana' }, { name: 'es' }],
      exactMatchedIndices: [{ name: 'kibana' }],
      partialMatchedIndices: [{ name: 'kibana' }],
      visibleIndices: [{ name: 'kibana' }]
    });
  });

  it('should return all indices as visible if there are no partial or exact matches', () => {
    const indices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' }
    ];

    const query = 'fo';
    const matchedIndices = [];

    const result = getMatchedIndices(indices, matchedIndices, query, false);

    expect(result).toEqual({
      allIndices: [{ name: 'kibana' }, { name: 'es' }],
      exactMatchedIndices: [],
      partialMatchedIndices: [],
      visibleIndices: [{ name: 'kibana' }, { name: 'es' }]
    });
  });

  it('should support showing system indices', () => {
    const indices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' }
    ];

    const query = 'ki';
    const matchedIndices = [
      { name: '.kibana' },
      { name: 'kibana' },
    ];

    const result = getMatchedIndices(indices, matchedIndices, query, true);

    expect(result).toEqual({
      allIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }],
      exactMatchedIndices: [],
      partialMatchedIndices: [{ name: '.kibana' }, { name: 'kibana' }],
      visibleIndices: [{ name: '.kibana' }, { name: 'kibana' }]
    });
  });

  it('should only return the max number of indices', () => {
    const indices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' },
      { name: 'monitor' },
      { name: '.monitor' },
      { name: 'metricbeat' },
    ];

    const query = '';
    const matchedIndices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' },
      { name: 'monitor' },
      { name: '.monitor' },
      { name: 'metricbeat' },
    ];

    const result = getMatchedIndices(indices, matchedIndices, query, true);

    expect(result).toEqual({
      allIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }, { name: 'monitor' }, { name: '.monitor' }],
      exactMatchedIndices: [],
      partialMatchedIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }, { name: 'monitor' }, { name: '.monitor' }],
      visibleIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }, { name: 'monitor' }, { name: '.monitor' }]
    });
  });
});
