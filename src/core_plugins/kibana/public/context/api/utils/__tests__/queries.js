import expect from 'expect.js';

import {
  createAnchorQuery,
  createSuccessorsQuery,
} from 'plugins/kibana/context/api/utils/queries';


describe('context app', function () {
  describe('function createAnchorQuery', function () {
    it('should return a search definition that searches the given uid', function () {
      const query = createAnchorQuery('UID', { '@timestamp': 'desc' });
      expect(query.query.terms._uid[0]).to.eql('UID');
    });

    it('should return a search definition that sorts by the given criteria', function () {
      const query = createAnchorQuery('UID', { '@timestamp': 'desc' });
      expect(query.sort[0]).to.eql({ '@timestamp': 'desc' });
    });
  });

  describe('function createSuccessorsQuery', function () {
    it('should return a search definition that includes the given size', function () {
      const query = createSuccessorsQuery('UID', [0], { '@timestamp' : 'desc' }, 10);
      expect(query).to.have.property('size', 10);
    });

    it('should return a search definition that sorts by the given criteria and uid', function () {
      const query = createSuccessorsQuery('UID', [0], { '@timestamp' : 'desc' }, 10);
      expect(query).to.have.property('sort');
      expect(query.sort).to.eql([
        { '@timestamp': 'desc' },
        { _uid: 'asc' },
      ]);
    });

    it('should return a search definition that search after the given uid', function () {
      const query = createSuccessorsQuery('UID', [0], { '@timestamp' : 'desc' }, 10);
      expect(query).to.have.property('search_after');
      expect(query.search_after).to.eql([0, 'UID']);
    });
  });
});
