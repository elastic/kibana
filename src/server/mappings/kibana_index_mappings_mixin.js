import { IndexMappings } from './index_mappings';

/**
 *  The default mappings used for the kibana index. This is
 *  extended via uiExports type "mappings". See the kibana
 *  and timelion plugins for examples.
 *  @type {EsMappingDsl}
 */
const BASE_KIBANA_INDEX_MAPPINGS_DSL = {
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
  /**
   *  Stores the current mappings that we expect to find in the Kibana
   *  index. Using `kbnServer.mappings.addRootProperties()` the UiExports
   *  class extends these mappings based on `mappings` ui export specs.
   *
   *  Application code should not access this object, and instead should
   *  use `server.getKibanaIndexMappingsDsl()` from below, mixed with the
   *  helpers exposed by this module, to interact with the mappings via
   *  their DSL.
   *
   *  @type {IndexMappings}
   */
  kbnServer.mappings = new IndexMappings(BASE_KIBANA_INDEX_MAPPINGS_DSL);

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
    return kbnServer.mappings.getDsl();
  });
}
