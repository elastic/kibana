var utils = module.exports;
var Promise = require('bluebird');
var request = require('request');
var _ = require('lodash');

utils.cache = require('./cache');
utils.request = Promise.promisify(request.get);

utils.flatten = function (object) {
  var flatten = function (memo, val, key, collection, parents) {
    if (_.isArray(parents))  {
      parents.push(key);
    } else {
      parents = [key];
    }

    var field = { name: parents.join('.'), value: val };

    if (_.isArray(field.value)) {
      field.value = field.value.join(',');
    } else if (_.isPlainObject(field.value)) {
      // do something recursive
      return _.reduce(field.value, _.partialRight(flatten, parents), memo);
    }

    memo.push(field);

    // once the field is added to the object you need to pop the parents
    // to remove it since we've hit the end of the branch.
    parents.pop();
    return memo;
  };

  var args = _.reduce(object, flatten, []);
  return args;
};
