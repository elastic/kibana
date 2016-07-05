import _ from 'lodash';

export default function isGeoPointObject(object) {
  let retVal = false;

  if (_.isPlainObject(object)) {
    const keys = _.keys(object);
    if (keys.length === 2 && _.contains(keys, 'lat') && _.contains(keys, 'lon')) {
      retVal = true;
    }
  }

  return retVal;
}

