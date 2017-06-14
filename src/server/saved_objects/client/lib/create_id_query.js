/**
 * Finds a document by either its v6 or v5 format
 * @param type The documents type
 * @param id The documents id or legacy id
**/
export function createIdQuery({ type, id }) {
  return {
    version: true,
    query: {
      bool: {
        should: [
          {
            ids: {
              values: id,
              type
            }
          },
          {
            bool: {
              must: [
                {
                  term: {
                    id: {
                      value: id
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
}
