/**
 * Finds a document by either its v5 or v6 format
 *
 * @param type The documents type
 * @param id The documents id or legacy id
**/
export function createIdQuery({ type, id }) {
  return {
    version: true,
    size: 1,
    query: {
      bool: {
        should: [
          // v5 document
          {
            bool: {
              must: [
                { term: { _id: id } },
                { term: { _type: type } }
              ]
            }
          },
          // migrated v5 document
          {
            bool: {
              must: [
                { term: { _id: `${type}:${id}` } },
                { term: { type: type } }
              ]
            }
          },
          // v6 document
          {
            bool: {
              must: [
                { term: { _id: id } },
                { term: { type: type } }
              ]
            }
          },
        ]
      }
    }
  };
}
