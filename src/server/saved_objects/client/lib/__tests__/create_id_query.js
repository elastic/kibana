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
            // v5 document
            {
              bool: {
                must: [
                  { term: { _id: 'foo' } },
                  { term: { _type: 'bar' } }
                ]
              }
            },
            // migrated v5 document
            {
              bool: {
                must: [
                  { term: { _id: 'bar:foo' } },
                  { term: { type: 'bar' } }
                ]
              }
            },
            // v6 document
            {
              bool: {
                must: [
                  { term: { _id: 'foo' } },
                  { term: { type: 'bar' } }
                ]
              }
            },
          ]
        }
      }
    };

    expect(query).to.eql(expectedQuery);
  });
});
