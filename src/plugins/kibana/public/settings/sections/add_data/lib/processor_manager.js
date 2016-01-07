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
  self.counter += 1;

  const newProcessor = new Processor(processorType);
  newProcessor.processorId = `processor_${self.counter}`; //Keep the processorId value a string.
  processors.push(newProcessor);
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

  let topProcessorChanged;
  let lastProcessor;
  if (topIndexChanged < Infinity) {
    topProcessorChanged = processors[topIndexChanged];
  }
  if (processors.length > 0) {
    lastProcessor = processors[processors.length-1];
  }
  if (!topProcessorChanged){
    topProcessorChanged = lastProcessor;
  }
  return { topProcessorChanged, lastProcessor };
}
