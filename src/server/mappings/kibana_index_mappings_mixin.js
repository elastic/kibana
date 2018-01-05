import { IndexMappings } from './index_mappings';

/**
 *  The default mappings used for the kibana index. This is
 *  extended via uiExports type "mappings". See the kibana
 *  and timelion plugins for examples.
 *  @type {EsMappingDsl}
 */
const BASE_SAVED_OBJECT_MAPPINGS = {
  doc: {
    dynamic: 'strict',
    properties: {
      type: {
        type: 'keyword'
      },
      updated_at: {
        type: 'date'
      },
      config: {
        dynamic: true,
        properties: {
          buildNum: {
            type: 'keyword'
          }
        }
      },
    }
  }
};

export function kibanaIndexMappingsMixin(kbnServer, server) {
  const mappings = new IndexMappings(
    BASE_SAVED_OBJECT_MAPPINGS,
    kbnServer.uiExports.savedObjectMappings
  );

  /**
   *  Get the mappings dsl that we expect to see in the
   *  Kibana index. Used by the elasticsearch plugin to create
   *  and update the kibana index. Also used by the SavedObjectsClient
   *  to determine the properties defined in the mapping as well as
   *  things like the "rootType".
   *
   *  See `src/server/mappings/lib/index.js` for helpers useful for reading
   *  the EsMappingDsl object.
   *
   *  @method server.getKibanaIndexMappingsDsl
   *  @returns {EsMappingDsl}
   */
  server.decorate('server', 'getKibanaIndexMappingsDsl', () => {
    return mappings.getDsl();
  });
}
