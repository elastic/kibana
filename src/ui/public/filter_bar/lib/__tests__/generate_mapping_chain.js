import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibGenerateMappingChainProvider } from 'ui/filter_bar/lib/generate_mapping_chain';

describe('Filter Bar Directive', function () {
  describe('generateMappingChain()', function () {

    let generateMappingChain;

    let $rootScope;
    let Promise;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_, _Promise_) {
      $rootScope = _$rootScope_;
      Promise    = _Promise_;
      generateMappingChain = Private(FilterBarLibGenerateMappingChainProvider);
    }));


    it('should create a chaning function which calls the next function if the promise is rejected', function (done) {
      const filter = {};
      const mapping = sinon.stub();
      mapping.returns(Promise.reject(filter));
      const mappingChainFn = generateMappingChain(mapping);
      const next = sinon.stub();
      next.returns(Promise.resolve('good'));
      const chain = mappingChainFn(next);
      chain(filter).then(function (result) {
        expect(result).to.be('good');
        sinon.assert.calledOnce(next);
        done();
      });
      $rootScope.$apply();
    });

    it('should create a chaning function which DOES NOT call the next function if the result is resolved', function (done) {
      const mapping = sinon.stub();
      mapping.returns(Promise.resolve('good'));
      const mappingChainFn = generateMappingChain(mapping);
      const next = sinon.stub();
      next.returns(Promise.resolve('bad'));
      const chain = mappingChainFn(next);
      chain({}).then(function (result) {
        expect(result).to.be('good');
        sinon.assert.notCalled(next);
        done();
      });
      $rootScope.$apply();
    });

    it('should resolve result for the mapping function', function (done) {
      const mapping = sinon.stub();
      mapping.returns(Promise.resolve({ key: 'test', value: 'example' }));
      const mappingChainFn = generateMappingChain(mapping);
      const next = sinon.stub();
      const chain = mappingChainFn(next);
      chain({}).then(function (result) {
        sinon.assert.notCalled(next);
        expect(result).to.eql({ key: 'test', value: 'example' });
        done();
      });
      $rootScope.$apply();
    });

    it('should call the mapping function with the argument to the chain', function (done) {
      const mapping = sinon.stub();
      mapping.returns(Promise.resolve({ key: 'test', value: 'example' }));
      const mappingChainFn = generateMappingChain(mapping);
      const next = sinon.stub();
      const chain = mappingChainFn(next);
      chain({ test: 'example' }).then(function (result) {
        sinon.assert.calledOnce(mapping);
        expect(mapping.args[0][0]).to.eql({ test: 'example' });
        sinon.assert.notCalled(next);
        expect(result).to.eql({ key: 'test', value: 'example' });
        done();
      });
      $rootScope.$apply();
    });

    it('should resolve result for the next function', function (done) {
      const filter = {};
      const mapping = sinon.stub();
      mapping.returns(Promise.reject(filter));
      const mappingChainFn = generateMappingChain(mapping);
      const next = sinon.stub();
      next.returns(Promise.resolve({ key: 'test', value: 'example' }));
      const chain = mappingChainFn(next);
      chain(filter).then(function (result) {
        sinon.assert.calledOnce(mapping);
        sinon.assert.calledOnce(next);
        expect(result).to.eql({ key: 'test', value: 'example' });
        done();
      });
      $rootScope.$apply();
    });

    it('should reject with an error if no functions match', function (done) {
      const filter = {};
      const mapping = sinon.stub();
      mapping.returns(Promise.reject(filter));
      const mappingChainFn = generateMappingChain(mapping);
      const chain = mappingChainFn();
      chain(filter).catch(function (err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('No mappings have been found for filter.');
        done();
      });
      $rootScope.$apply();
    });

  });
});
