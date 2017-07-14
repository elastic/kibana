import { set, omit } from 'lodash';

import {
  createMapStream,
  getFlattenedObject,
} from '../../../utils';

export function createConvertToV6Stream() {
  return createMapStream(record => {
    switch (record.type) {
      case 'index': {
        const { index, settings, mappings } = record.value;

        // only convert kibana indices
        if (index !== '.kibana') {
          return record;
        }

        // already v6
        if (typeof mappings.doc === 'object') {
          return record;
        }

        // settings can be dot-notated strings or nested objects
        settings.index = getFlattenedObject(settings.index || {});
        delete settings.index['mapping.single_type'];
        set(settings.index, 'mapper.dynamic', false);

        return {
          type: 'index',
          value: {
            index,
            settings,
            mappings: {
              doc: {
                properties: {
                  type: {
                    type: 'keyword'
                  },
                  ...omit(mappings, '_default_')
                }
              }
            }
          }
        };
      }

      case 'doc': {
        const { index, type, id, source } = record.value;

        if (type === 'doc' && source.type) {
          // doc already v6
          return record;
        }

        return {
          type: 'doc',
          value: {
            index,
            type: 'doc',
            id,
            source: {
              type,
              [type]: source
            }
          }
        };
      }

      default:
        return record;
    }
  });
}
