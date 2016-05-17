import _ from 'lodash';
import isGeoPointObject from './is_geo_point_object';

// This function recursively traverses an object, visiting each node that elasticsearch would index as a field.
// Iteratee is invoked with two arguments: (value, fieldName). fieldName is the name of the field as elasticsearch
// would see it. For example:
//
// const testDoc = {
//   foo: [
//     {bar: [{'baz': 1}]},
//     {bat: 'boo'}
//   ],
//   geo: {
//     lat: 38.6631,
//     lon: -90.5771
//   }
// };
//
// forEachField(testDoc, function(value, fieldName) { ... });
//
// The iteratee would be invoked six times, with the following parameters:
// 1. fieldName = 'foo'          value = {bar: [{'baz': 1}]}
// 2. fieldName = 'foo'          value = {bat: 'boo'}
// 3. fieldName = 'foo.bar'      value = {'baz': 1}
// 4. fieldName = 'foo.bar.baz'  value = 1
// 5. fieldName = 'foo.bat'      value = 'boo'
// 6. fieldName = 'geo'          value = {lat: 38.6631, lon: -90.5771}
//
// forEachField handles arrays, objects, and geo_points as elasticsearch would. It does not currently handle nested
// type fields.

function forEachFieldAux(value, iteratee, fieldName) {
  if (!_.isObject(value) || isGeoPointObject(value)) {
    iteratee(value, fieldName);
  }
  else if (_.isPlainObject(value)) {
    if (!_.isEmpty(fieldName)) {
      iteratee(value, fieldName);
      fieldName += '.';
    }
    _.forEach(value, (subValue, key) => {
      forEachFieldAux(subValue, iteratee, fieldName + key);
    });
  }
  else if (_.isArray(value)) {
    _.forEach(value, (subValue) => {
      forEachFieldAux(subValue, iteratee, fieldName);
    });
  }
}

export default function forEachField(object, iteratee) {
  if (!_.isPlainObject(object)) {
    throw new Error('first argument must be a plain object');
  }

  forEachFieldAux(object, iteratee, '');
}
