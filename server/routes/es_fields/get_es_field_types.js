import { normalizeType } from './normalize_type';
import { mapValues, keys } from 'lodash';

export function getESFieldTypes(index, fields, elasticsearchClient) {
  const config = {
    index: index,
    fields: fields || '*',
  };

  if (fields && fields.length === 0) {
    return Promise.resolve({});
  }

  return elasticsearchClient('fieldCaps', config)
  .then(resp => {
    return mapValues(resp.fields, (types) => {

      if (keys(types).length > 1) return 'conflict';

      try {
        return normalizeType(keys(types)[0]);
      } catch (e) {
        return 'unsupported';
      }

    });
  });
}
