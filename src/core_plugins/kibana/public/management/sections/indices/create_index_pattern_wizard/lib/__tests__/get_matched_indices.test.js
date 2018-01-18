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
    it('should return all indices', () => {
      const query = 'ki';
      const { allIndices } = getMatchedIndices(indices, indices, query, true);
      expect(allIndices).toEqual(indices);
    });

    it('should return all indices except for system indices', () => {
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
  });

  describe('exactMatchedIndices', () => {
    it('should return all exact matched indices', () => {
      const query = 'ki*';
      const { exactMatchedIndices } = getMatchedIndices(indices, indices, query, true);
      expect(exactMatchedIndices).toEqual([
        { name: 'kibana' },
        { name: '.kibana' },
      ]);
    });

    it('should return all exact matched indices except for system indices', () => {
      const query = 'ki*';
      const { exactMatchedIndices } = getMatchedIndices(indices, indices, query, false);
      expect(exactMatchedIndices).toEqual([
        { name: 'kibana' },
      ]);
    });
  });

  describe('partialMatchedIndices', () => {
    it('should return all partial matched indices', () => {
      const query = 'ki*';
      const partialIndices = indices.slice(1);
      const { partialMatchedIndices } = getMatchedIndices(indices, partialIndices, query, true);
      expect(partialMatchedIndices).toEqual(partialIndices);
    });

    it('should return all partial matched indices except for system indices', () => {
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
  });

  describe('visibleIndices', () => {
    it('should return all visible indices', () => {
      const query = 'foo*';
      const { visibleIndices } = getMatchedIndices(indices, indices, query, true);
      expect(visibleIndices).toEqual(indices);
    });

    it('should return all visible indices except for system indices', () => {
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
  });
});
