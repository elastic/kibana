import _ from 'lodash';

export default function isGeoPointObject(object) {
  if (_.isPlainObject(object)) {
    const keys = _.keys(object);
    if (keys.length === 2 && _.contains(keys, 'lat') && _.contains(keys, 'lon')) {
      return true;
    }
  }
  else {
    return false;
  }
}

