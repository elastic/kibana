import _ from 'lodash';

const migrateIncludeExcludeFormat = {
  serialize: function (value) {
    if (!value || _.isString(value)) return value;
    else return value.pattern;
  },
  write: function (aggConfig, output) {
    const value = aggConfig.params[this.name];
    if (!value || _.isString(value)) output.params[this.name] = value;
    else output.params[this.name] = value.pattern;
  }
};

export default migrateIncludeExcludeFormat;
