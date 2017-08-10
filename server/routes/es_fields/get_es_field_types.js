import { normalizeType } from './normalize_type';
import { mapValues, keys } from 'lodash';
import elasticsearch from 'elasticsearch';

const client = new elasticsearch.Client({
  host: 'localhost:9200',
});

export function getESFieldTypes(index, fields) {
  const config = {
    index: index,
    fields: fields || '*',
  };

  return client
    .fieldCaps(config)
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
