const _ = require('lodash');

export default function ProcessorManager() {
  const self = this;

  self.processors = [];
};

ProcessorManager.prototype.remove = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  processors.splice(index, 1);
}

ProcessorManager.prototype.moveUp = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === 0) return;

  const temp = processors[index - 1];
  processors[index - 1] = processors[index];
  processors[index] = temp;
}

ProcessorManager.prototype.moveDown = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === processors.length - 1) return;

  const temp = processors[index + 1];
  processors[index + 1] = processors[index];
  processors[index] = temp;
}

ProcessorManager.prototype.add = function(processorType) {
  const self = this;
  const processors = self.processors;

  const newProcessor = _.cloneDeep(processorType);
  processors.push(newProcessor);
}
