import { getMatchedIndices } from '../get_matched_indices';

jest.mock('../../constants', () => ({
  MAX_NUMBER_OF_MATCHING_INDICES: 6,
}));

const indices = [
  { name: 'kibana' },
  { name: 'es' },
  { name: 'logstash' },
  { name: 'packetbeat' },
  { name: 'metricbeat' },
  { name: '.kibana' }
];

describe('getMatchedIndices', () => {
  describe('allIndices', () => {
    it('should return filtered', () => {
      const query = 'ki';
      const { allIndices } = getMatchedIndices(indices, indices, query, false);
      expect(allIndices).toEqual([
        { name: 'kibana' },
        { name: 'es' },
        { name: 'logstash' },
        { name: 'packetbeat' },
        { name: 'metricbeat' },
      ]);
    });

    it('should return unfiltered', () => {
      const query = 'ki';
      const { allIndices } = getMatchedIndices(indices, indices, query, true);
      expect(allIndices).toEqual(indices);
    });
  });

  describe('exactMatchedIndices', () => {
    it('should return filtered', () => {
      const query = 'ki*';
      const { exactMatchedIndices } = getMatchedIndices(indices, indices, query, false);
      expect(exactMatchedIndices).toEqual([
        { name: 'kibana' },
      ]);
    });

    it('should return unfiltered', () => {
      const query = 'ki*';
      const { exactMatchedIndices } = getMatchedIndices(indices, indices, query, true);
      expect(exactMatchedIndices).toEqual([
        { name: 'kibana' },
        { name: '.kibana' },
      ]);
    });
  });

  describe('partialMatchedIndices', () => {
    it('should return filtered', () => {
      const query = 'ki*';
      const partialIndices = indices.slice(1);
      const { partialMatchedIndices } = getMatchedIndices(indices, partialIndices, query, false);
      expect(partialMatchedIndices).toEqual([
        { name: 'es' },
        { name: 'logstash' },
        { name: 'packetbeat' },
        { name: 'metricbeat' },
      ]);
    });

    it('should return unfiltered', () => {
      const query = 'ki*';
      const partialIndices = indices.slice(1);
      const { partialMatchedIndices } = getMatchedIndices(indices, partialIndices, query, true);
      expect(partialMatchedIndices).toEqual(partialIndices);
    });
  });

  describe('visibleIndices', () => {
    it('should return filtered', () => {
      const query = 'foo*';
      const { visibleIndices } = getMatchedIndices(indices, indices, query, false);
      expect(visibleIndices).toEqual([
        { name: 'kibana' },
        { name: 'es' },
        { name: 'logstash' },
        { name: 'packetbeat' },
        { name: 'metricbeat' },
      ]);
    });

    it('should return unfiltered', () => {
      const query = 'foo*';
      const { visibleIndices } = getMatchedIndices(indices, indices, query, true);
      expect(visibleIndices).toEqual(indices);
    });
  });
});
