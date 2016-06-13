import expect from 'expect.js';
import sinon from 'sinon';
import _ from 'lodash';
import { kibanaToEs, esToKibana } from '../converter';
import setConverter from '../../processors/set/converter';
import joinConverter from '../../processors/join/converter';

describe('ingest', () => {

  describe('pipeline', () => {

    describe('converter', () => {

      describe('kibanaToEs', () => {

        let source;
        let expected;
        let setStub;
        let joinStub;
        beforeEach(function () {
          setStub = sinon.stub(setConverter, 'kibanaToEs', () => {
            return { foo: 'bar' };
          });
          joinStub = sinon.stub(joinConverter, 'kibanaToEs', () => {
            return { bar: 'baz' };
          });

          source = [ { type_id: 'set' }, { type_id: 'join' }];
          expected = {
            processors: [ { foo: 'bar' }, { bar: 'baz' } ]
          };
        });

        afterEach(function () {
          setConverter.kibanaToEs.restore();
          joinConverter.kibanaToEs.restore();
        });

        it('should convert from a kibana api object to an elasticsearch object', () => {
          const actual = kibanaToEs(source);
          sinon.assert.calledOnce(setStub);
          sinon.assert.calledOnce(joinStub);
          expect(_.isEqual(actual, expected)).to.be.ok();
        });

        it('should ignore additional source fields', () => {
          source.foo = 'bar';
          source.bar = 'baz';

          const actual = kibanaToEs(source);
          expect(_.isEqual(actual, expected)).to.be.ok();
        });

      });

      describe('esToKibana', () => {

        it('should throw an error', () => {
          expect(esToKibana).withArgs({}).to.throwException(/not implemented/i);
        });

      });

    });

  });

});
