import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action addFilter', function () {
    let filterManagerStub;
    let addFilter;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      filterManagerStub = createFilterManagerStub();
      Private.stub(FilterManagerProvider, filterManagerStub);

      addFilter = Private(QueryParameterActionsProvider).addFilter;
    }));

    it('should pass the given arguments to the filterManager', function () {
      const state = createStateStub();

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      const filterManagerAddStub = filterManagerStub.add;
      expect(filterManagerAddStub.calledOnce).to.be(true);
      expect(filterManagerAddStub.firstCall.args[0]).to.eql('FIELD_NAME');
      expect(filterManagerAddStub.firstCall.args[1]).to.eql('FIELD_VALUE');
      expect(filterManagerAddStub.firstCall.args[2]).to.eql('FILTER_OPERATION');
    });

    it('should pass the index pattern id to the filterManager', function () {
      const state = createStateStub();

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

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
