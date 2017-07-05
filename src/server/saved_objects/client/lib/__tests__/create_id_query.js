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
            {
              bool: {
                must: [
                  { term: { _id: 'foo' } },
                  { term: { _type: 'bar' } }
                ]
              }
            },{
              bool: {
                must: [
                  { term: { legacyId: 'foo' } },
                  { term: { type: 'bar' } }
                ]
              }
            },
            {
              bool: {
                must: [
                  { term: { _id: 'foo' } },
                  { term: { type: 'bar' } }
                ]
              }
            }
          ]
        }
      }
    };

    expect(query).to.eql(expectedQuery);
  });
});
