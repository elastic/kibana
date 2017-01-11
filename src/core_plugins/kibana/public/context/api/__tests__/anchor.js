import { expect } from 'chai';
import sinon from 'sinon';

import { fetchAnchor } from 'plugins/kibana/context/api/anchor';


describe('context app', function () {
  describe('function fetchAnchor', function () {
    it('should use the `search` api to query the given index', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const esStub = createEsStub(['hit1']);

      return fetchAnchor(esStub, indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          expect(esStub.search.calledOnce).to.be.true;
          expect(esStub.search.firstCall.args)
            .to.have.lengthOf(1)
            .with.deep.property('[0].index', 'index1');
        });
    });

    it('should include computed fields in the query', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const esStub = createEsStub(['hit1']);

      return fetchAnchor(esStub, indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(() => {
          expect(esStub.search.calledOnce).to.be.true;
          expect(esStub.search.firstCall.args)
            .to.have.lengthOf(1)
            .with.deep.property('[0].body')
              .that.contains.all.keys(['script_fields', 'docvalue_fields', 'stored_fields']);
        });
    });

    it('should reject with an error when no hits were found', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const esStub = createEsStub([]);

      return fetchAnchor(esStub, indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then(
          () => {
            expect(true, 'expected the promise to be rejected').to.be.false;
          },
          (error) => {
            expect(error).to.be.an('error');
          }
        );
    });

    it('should return the first hit after adding an anchor marker', function () {
      const indexPatternStub = createIndexPatternStub('index1');
      const esStub = createEsStub([{ property1: 'value1' }, {}]);

      return fetchAnchor(esStub, indexPatternStub, 'UID', { '@timestamp': 'desc' })
        .then((anchorDocument) => {
          expect(anchorDocument).to.have.property('property1', 'value1');
          expect(anchorDocument).to.have.property('$$_isAnchor', true);
        });
    });
  });
});


function createIndexPatternStub(indices) {
  return {
    getComputedFields: sinon.stub()
      .returns({}),
    toIndexList: sinon.stub()
      .returns(indices),
  };
}

function createEsStub(hits) {
  return {
    search: sinon.stub()
      .returns({
        hits: {
          hits,
          total: hits.length,
        },
      }),
  };
}
