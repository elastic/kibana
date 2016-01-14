const _ = require('lodash');

export default function Processor(processorType) {
  const self = this;

  _.merge(self, _.pick(processorType, ['title', 'template', 'typeid', 'getDefinition', 'getDescription']));
  //self.initialized = false;
};

Processor.prototype.setParent = function(newParent) {
  const self = this;

  const oldParent = self.parent;
  self.parent = newParent;

  return (oldParent !== self.parent);
}

// Processor.prototype.setError = function(error) {
//   const self = this;

//   const root_cause = _.get(error, 'root_cause[0]');

//   self.errorMessage = _.get(root_cause, 'reason') || _.get(root_cause, 'type');
// }

Processor.prototype.setError = function(error) {
  const self = this;
  self.errorMessage = error;
}

Processor.prototype.updateDescription = function() {
  const self = this;

  self.description = self.getDescription();
}
