const _ = require('lodash');

export default function Processor(processorType) {
  const self = this;

  _.merge(self, _.pick(processorType, ['title', 'template', 'typeid']));
};

Processor.prototype.setParent = function(newParent) {
  const self = this;

  const oldParent = self.parent;
  self.parent = newParent;

  return (oldParent !== self.parent);
}
