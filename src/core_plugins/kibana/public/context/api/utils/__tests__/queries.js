import { expect } from 'chai';

import {
  createAnchorQuery,
  createSuccessorsQuery,
} from 'plugins/kibana/context/api/utils/queries';


describe('context app', function () {
  describe('function createAnchorQuery', function () {
    it('should return a search definition that searches the given uid', function () {
      expect(createAnchorQuery('UID', { '@timestamp': 'desc' }))
        .to.have.deep.property('query.terms._uid[0]', 'UID');
    });

    it('should return a search definition that sorts by the given criteria', function () {
      expect(createAnchorQuery('UID', { '@timestamp': 'desc' }))
        .to.have.deep.property('sort[0]')
        .that.is.deep.equal({ '@timestamp': 'desc' });
    });
  });

  describe('function createSuccessorsQuery', function () {
    it('should return a search definition that includes the given size', function () {
      expect(createSuccessorsQuery('UID', [0], { '@timestamp' : 'desc' }, 10))
        .to.have.property('size', 10);
    });

    it('should return a search definition that sorts by the given criteria and uid', function () {
      expect(createSuccessorsQuery('UID', [0], { '@timestamp' : 'desc' }, 10))
        .to.have.property('sort')
        .that.is.deep.equal([
          { '@timestamp': 'desc' },
          { _uid: 'asc' },
        ]);
    });

    it('should return a search definition that search after the given uid', function () {
      expect(createSuccessorsQuery('UID', [0], { '@timestamp' : 'desc' }, 10))
        .to.have.property('search_after')
        .that.is.deep.equal([0, 'UID']);
    });
  });
});
