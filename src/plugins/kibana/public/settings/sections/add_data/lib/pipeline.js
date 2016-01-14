const _ = require('lodash');
const Processor = require('./processor');

export default function Pipeline() {
  const self = this;

  self.processors = [];
  self.counter = 0;
  self.rootObject = {};
};

Pipeline.prototype.remove = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  processors.splice(index, 1);
}

Pipeline.prototype.moveUp = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === 0) return;

  const temp = processors[index - 1];
  processors[index - 1] = processors[index];
  processors[index] = temp;
}

Pipeline.prototype.moveDown = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === processors.length - 1) return;

  const temp = processors[index + 1];
  processors[index + 1] = processors[index];
  processors[index] = temp;
}

Pipeline.prototype.add = function(processorType) {
  const self = this;
  const processors = self.processors;
  self.counter += 1;

  const newProcessor = new Processor(processorType);
  newProcessor.processorId = `processor_${self.counter}`; //Keep the processorId value a string.
  processors.push(newProcessor);
}

Pipeline.prototype.updateParents = function() {
  const self = this;
  const processors = self.processors;

  processors.forEach((processor, index) => {
    let newParent;
    if (index === 0) {
      newParent = self.rootObject;
    } else {
      newParent = processors[index - 1];
    }

    processor.setParent(newParent);
  });
}

Pipeline.prototype.getProcessorById = function(processorId) {
  const self = this;
  return _.find(self.processors, (processor) => {return processor.processorId === processorId; });
}
