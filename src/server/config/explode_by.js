import _ from 'lodash';
module.exports = function (dot, flatObject) {
  const fullObject = {};
  _.each(flatObject, function (value, key) {
    const keys = key.split(dot);
    (function walk(memo, keys, value) {
      const _key = keys.shift();
      if (keys.length === 0) {
        memo[_key] = value;
      } else {
        if (!memo[_key]) memo[_key] = {};
        walk(memo[_key], keys, value);
      }
    }(fullObject, keys, value));
  });
  return fullObject;
};


