import expect from 'expect.js';
import { createIdQuery } from '../create_id_query';

describe('createIdQuery', () => {
  it('takes an id and type', () => {
    const query = createIdQuery({
      id: 'foo',
      type: 'bar'
    });
    const expectedQuery = {
      version: true,
      query: {
        bool: {
          should: [
            {
              ids: {
                values: 'foo',
                type: 'bar'
              }
            },
            {
              bool: {
                must: [
                  {
                    term: {
                      id: {
                        value: 'foo'
                      }
                    }
                  },
                  {
                    type: {
                      value: 'doc'
                    }
                  }
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
