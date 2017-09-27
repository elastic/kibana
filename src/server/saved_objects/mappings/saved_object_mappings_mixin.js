import { Mappings } from './mappings';

export function savedObjectMappingsMixin(kbnServer) {
  kbnServer.savedObjectMappings = new Mappings({
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
  });
}
