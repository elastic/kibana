import _ from 'ui/lodash';
const keys = {};
export default {
  get: function (path, def) {
    return keys[path] == null ? def : keys[path];
  },
  set: function (path, val) {
    keys[path] = val;
    return val;
  },
  setSilent: function (path, val) {
    keys[path] = val;
    return val;
  },
  emit: _.noop,
  on: _.noop,
  off: _.noop
};
