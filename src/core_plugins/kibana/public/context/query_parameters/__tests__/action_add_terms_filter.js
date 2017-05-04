import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action addTermsFilter', function () {
    let filterManagerStub;
    let addTermsFilter;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      filterManagerStub = createFilterManagerStub();
      Private.stub(FilterManagerProvider, filterManagerStub);

      addTermsFilter = Private(QueryParameterActionsProvider).addTermsFilter;
    }));

    it('should pass the given arguments to the filterManager', function () {
      const state = createStateStub();

      addTermsFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      const filterManagerAddStub = filterManagerStub.add;
      expect(filterManagerAddStub.calledOnce).to.be(true);
      expect(filterManagerAddStub.firstCall.args[0]).to.eql('FIELD_NAME');
      expect(filterManagerAddStub.firstCall.args[1]).to.eql('FIELD_VALUE');
      expect(filterManagerAddStub.firstCall.args[2]).to.eql('FILTER_OPERATION');
    });

    it('should pass the index pattern id to the filterManager', function () {
      const state = createStateStub();

      addTermsFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      const filterManagerAddStub = filterManagerStub.add;
      expect(filterManagerAddStub.calledOnce).to.be(true);
      expect(filterManagerAddStub.firstCall.args[3]).to.eql('INDEX_PATTERN_ID');
    });
  });
});

function createFilterManagerStub() {
  return {
    add: sinon.stub(),
  };
}
