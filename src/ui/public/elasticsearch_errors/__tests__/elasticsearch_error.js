import expect from 'expect.js';
import { ElasticsearchError } from '../elasticsearch_error';

describe('ElasticsearchError', () => {
  function createError(rootCauses = []) {
    // Elasticsearch errors are characterized by the resp.error.root_cause array.
    return {
      resp: {
        error: {
          root_cause: rootCauses.map(rootCause => ({
            reason: rootCause,
          })),
        }
      }
    };
  }

  describe('interface', () => {
    describe('constructor', () => {
      it('throws an error if instantiated with a non-elasticsearch error', () => {
        expect(() => new ElasticsearchError({})).to.throwError();
      });
    });

    describe('getRootCauses', () => {
      it(`returns the root_cause array's reason values`, () => {
        const rootCauses = ['a', 'b'];
        const error = createError(rootCauses);
        const esError = new ElasticsearchError(error);
        expect(esError.getRootCauses()).to.eql(rootCauses);
      });
    });

    describe('hasRootCause', () => {
      it(`returns true if the cause occurs in the root_cause array's reasons, insensitive to case`, () => {
        const rootCauses = ['a very detailed error', 'a slightly more detailed error'];
        const error = createError(rootCauses);
        const esError = new ElasticsearchError(error);
        expect(esError.hasRootCause('slightly MORE')).to.be(true);
      });

      it(`returns false if the cause doesn't occur in the root_cause array's reasons`, () => {
        const rootCauses = ['a very detailed error', 'a slightly more detailed error'];
        const error = createError(rootCauses);
        const esError = new ElasticsearchError(error);
        expect(esError.hasRootCause('nonexistent error')).to.be(false);
      });
    });
  });
});
