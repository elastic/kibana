import _ from 'lodash';
module.exports = function (dot, nestedObj, flattenArrays) {
  let stack = []; // track key stack
  let flatObj = {};
  (function flattenObj(obj) {
    _.keys(obj).forEach(function (key) {
      stack.push(key);
      if (!flattenArrays && _.isArray(obj[key])) flatObj[stack.join(dot)] = obj[key];
      else if (_.isObject(obj[key])) flattenObj(obj[key]);
      else flatObj[stack.join(dot)] = obj[key];
      stack.pop();
    });
  }(nestedObj));
  return flatObj;
};


