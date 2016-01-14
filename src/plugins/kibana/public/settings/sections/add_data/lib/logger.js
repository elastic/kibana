const _ = require('lodash');

export default function Logger(source, enabled) {
  const self = this;

  self.enabled = !!enabled;
  self.source = source;
};

Logger.prototype.log = function(message, extra) {
  const self = this;

  if (!self.enabled) return;

  if (extra) {
    console.log(self.source, message, _.cloneDeep(extra));
  } else {
    console.log(self.source, message);
  }
}
