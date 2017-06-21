/**
 * Finds a document by either its v6 or v5 format
 * @param type The documents type
 * @param id The documents id or legacy id
**/
export function createIdQuery({ type, id }) {
  const ids = {
    values: id
  };

  if (type) ids.type = type;
  return {
    version: true,
    query: {
      bool: {
        should: [
          {
            ids
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
