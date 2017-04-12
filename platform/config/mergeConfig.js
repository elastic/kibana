// @flow

import { isPlainObject, forOwn, set, transform } from 'lodash';

// TODO Describe this, purely copied from old Kibana
export function merge(sources: Array<mixed>): { [key: string]: mixed } {
  return transform(
    sources,
    (merged, source) => {
      forOwn(source, function apply(val, key) {
        if (isPlainObject(val)) {
          forOwn(val, function (subVal, subKey) {
            apply(subVal, key + '.' + subKey);
          });
          return;
        }

        if (Array.isArray(val)) {
          set(merged, key, []);
          val.forEach((subVal, i) => apply(subVal, key + '.' + i));
          return;
        }

        set(merged, key, val);
      });
    },
    {}
  );
}
