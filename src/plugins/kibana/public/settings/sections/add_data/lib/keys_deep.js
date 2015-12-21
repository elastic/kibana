const _ = require('lodash');

export default function keysDeep(object, base) {
  let result = [];
  let delimitedBase = base ? base + '.' : '';

  _.forIn(object, function(value, key) {
    var fullKey = delimitedBase + key;
    if (_.isArray(value)) {
      result.push(fullKey)
    } else if (_.isObject(value)) {
      result = result.concat(keysDeep(value, fullKey));
    } else {
      result.push(fullKey);
    }
  });

  if (base) {
    result.push(base);
  }

  return result;
}

// const _ = require('lodash');

// export default function keysDeep(object, base) {
//   var result = [];
//   base = base ? base + '.' : '';

//   _.forIn(object, function(value, key) {
//     var fullKey = base + key;
//     if (_.isArray(value)) {
//       result.push(fullKey)
//       return;
//     }
//     if (_.isObject(value)) {
//       result = result.concat(keysDeep(value, fullKey));
//       return;
//     }
//     result.push(fullKey)
//   });

//   return result;
// }
