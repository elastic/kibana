import expect from 'expect.js';
import { createIdQuery } from '../create_id_query';

describe('createIdQuery', () => {
  it('takes an id and type', () => {
    const query = createIdQuery({ id: 'foo', type: 'bar' });

    const expectedQuery = {
      version: true,
      size: 1,
      query: {
        bool: {
          should: [
            // v5/v6 document
            { term: { _id: 'foo' } },

            // migrated v5 document
            { term: { _id: 'bar:foo' } }
          ]
        }
      }
    };

    expect(query).to.eql(expectedQuery);
  });
});
