import expect from 'expect.js';

import {
  createAnchorQueryBody,
  createSuccessorsQueryBody,
} from 'plugins/kibana/context/api/utils/queries';


describe('context app', function () {
  describe('function createAnchorQueryBody', function () {
    it('should return a search definition that searches the given uid', function () {
      const query = createAnchorQueryBody('UID', { '@timestamp': 'desc' });
      expect(query.query.terms._uid[0]).to.eql('UID');
    });

    it('should return a search definition that sorts by the given criteria', function () {
      const query = createAnchorQueryBody('UID', [{ '@timestamp': 'desc' }, { _doc: 'asc' }]);
      expect(query.sort).to.eql([
        { '@timestamp': 'desc' },
        { _doc: 'asc' },
      ]);
    });
  });

  describe('function createSuccessorsQueryBody', function () {
    it('should return a search definition that includes the given size', function () {
      const query = createSuccessorsQueryBody([0, 1], [{ '@timestamp' : 'desc' }, { _doc: 'asc' }], 10);
      expect(query).to.have.property('size', 10);
    });

    it('should return a search definition that sorts by the given criteria', function () {
      const query = createSuccessorsQueryBody([0, 1], [{ '@timestamp' : 'desc' }, { _doc: 'asc' }], 10);
      expect(query).to.have.property('sort');
      expect(query.sort).to.eql([
        { '@timestamp': 'desc' },
        { _doc: 'asc' },
      ]);
    });

    it('should return a search definition that searches after the given uid', function () {
      const query = createSuccessorsQueryBody([0, 1], [{ '@timestamp' : 'desc' }, { _doc: 'asc' }], 10);
      expect(query).to.have.property('search_after');
      expect(query.search_after).to.eql([0, 1]);
    });
  });
});
