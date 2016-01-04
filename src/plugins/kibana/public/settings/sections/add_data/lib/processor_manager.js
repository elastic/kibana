const _ = require('lodash');
const Processor = require('./processor');

export default function ProcessorManager() {
  const self = this;

  self.processors = [];
  self.counter = 0;
  self.rootObject = {};
};

ProcessorManager.prototype.remove = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  processors.splice(index, 1);

  self.log();
}

ProcessorManager.prototype.moveUp = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === 0) return;

  const temp = processors[index - 1];
  processors[index - 1] = processors[index];
  processors[index] = temp;

  self.log();
}

ProcessorManager.prototype.moveDown = function(processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === processors.length - 1) return;

  const temp = processors[index + 1];
  processors[index + 1] = processors[index];
  processors[index] = temp;

  self.log();
}

ProcessorManager.prototype.add = function(processorType) {
  const self = this;
  const processors = self.processors;
  self.counter += 1;

  const newProcessor = new Processor(processorType);
  newProcessor.processorId = self.counter;
  processors.push(newProcessor);

  self.log();
}

ProcessorManager.prototype.log = function() {
  const self = this;

  console.log('Manager', self.processors);
}

ProcessorManager.prototype.updateParents = function() {
  const self = this;
  const processors = self.processors;

  let topIndexChanged = Infinity;
  processors.forEach((processor, index) => {
    let newParent;
    if (index === 0) {
      newParent = self.rootObject;
    } else {
      newParent = processors[index - 1];
    }

    let changed = processor.setParent(newParent);
    if (changed) {
      topIndexChanged = Math.min(index, topIndexChanged);
    }
  });

  if (topIndexChanged < Infinity) {
    return processors[topIndexChanged];
  }
}
