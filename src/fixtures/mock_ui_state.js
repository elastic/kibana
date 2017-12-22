import _ from 'lodash';
let values = {};
export default {
  get: function (path, def) {
    return _.get(values, path, def);
  },
  set: function (path, val) {
    _.set(values, path, val);
    return val;
  },
  setSilent: function (path, val) {
    _.set(values, path, val);
    return val;
  },
  emit: _.noop,
  on: _.noop,
  off: _.noop,
  clearAllKeys: function () {
    values = {};
  },
  _reset: function () {
    values = {};
  }
};
