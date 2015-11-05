var bytes = require('bytes');

// Merge source object with target object while handling threshold option
// Used to merge user defined plugin options with default options
function merge(target, source) {
  if (typeof source === 'undefined') source = {};

  Object.keys(source).forEach(function(key) {
    if (key === 'threshold') {
      target[key] = threshold(source[key]);
    } else {
      target[key] = source[key];
    }
  });

  return target;
}

// Parse the threshold plugin option
// Specifies the minimum file size that will be compressed
// Can be a string, number, or boolean
function threshold(obj) {
  var ret;

  switch (typeof obj) {
    case 'string':
      ret = bytes(obj) < 150 ? 150 : bytes(obj);
      break;
    case 'number':
      ret = obj < 150 ? 150 : obj;
      break;
    case 'boolean':
      ret = obj === false ? false : 150;
      break;
    default:
      throw new Error('threshold must be String|Number|Boolean');
  }

  return ret;
}

exports.merge     = merge;
exports.threshold = threshold;
