const _ = require('lodash');

export default function Processor(processorType) {
  const self = this;

  self.collapsed = false;
  self.error = undefined;

  _.merge(self, processorType);
};

Processor.prototype.setParent = function (newParent) {
  const self = this;

  const oldParent = self.parent;
  self.parent = newParent;

  return (oldParent !== self.parent);
};

Processor.prototype.updateDescription = function () {
  const self = this;

  self.description = self.getDescription();
};
