import { getWhitelistedIndices } from '../get_whitelisted_indices';

jest.mock('../../constants', () => ({
  MAX_NUMBER_OF_MATCHING_INDICES: 5,
}));

describe('getWhitelistedIndices', () => {
  it('should return exact matches if they exist', () => {
    const indices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' }
    ];

    const query = 'kibana';
    const matchingIndices = [
      { name: '.kibana' },
      { name: 'kibana' },
    ];

    const result = getWhitelistedIndices(indices, false, query, matchingIndices);

    expect(result).toEqual({
      initialIndices: [{ name: 'kibana' }, { name: 'es' }],
      exactMatchingIndices: [{ name: 'kibana' }],
      partialMatchingIndices: [{ name: 'kibana' }],
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
    const matchingIndices = [
      { name: '.kibana' },
      { name: 'kibana' },
    ];

    const result = getWhitelistedIndices(indices, false, query, matchingIndices);

    expect(result).toEqual({
      initialIndices: [{ name: 'kibana' }, { name: 'es' }],
      exactMatchingIndices: [{ name: 'kibana' }],
      partialMatchingIndices: [{ name: 'kibana' }],
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
    const matchingIndices = [];

    const result = getWhitelistedIndices(indices, false, query, matchingIndices);

    expect(result).toEqual({
      initialIndices: [{ name: 'kibana' }, { name: 'es' }],
      exactMatchingIndices: [],
      partialMatchingIndices: [],
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
    const matchingIndices = [
      { name: '.kibana' },
      { name: 'kibana' },
    ];

    const result = getWhitelistedIndices(indices, true, query, matchingIndices);

    expect(result).toEqual({
      initialIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }],
      exactMatchingIndices: [],
      partialMatchingIndices: [{ name: '.kibana' }, { name: 'kibana' }],
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
    const matchingIndices = [
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' },
      { name: 'monitor' },
      { name: '.monitor' },
      { name: 'metricbeat' },
    ];

    const result = getWhitelistedIndices(indices, true, query, matchingIndices);

    expect(result).toEqual({
      initialIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }, { name: 'monitor' }, { name: '.monitor' }],
      exactMatchingIndices: [],
      partialMatchingIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }, { name: 'monitor' }, { name: '.monitor' }],
      visibleIndices: [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }, { name: 'monitor' }, { name: '.monitor' }]
    });
  });
});
