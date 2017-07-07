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
          // v5/v6 document
          { term: { _id: id } },

          // migrated v5 document
          { term: { _id: `${type}:${id}` } }
        ]
      }
    }
  };
}
