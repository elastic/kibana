const _ = require('lodash');
const Processor = require('./processor');
const types = require('../../../../../../../domain/ingest_processor_types');

export default function Pipeline() {
  const self = this;

  self.processors = [];
  self.counter = 0;
  self.rootObject = {};
  self.output = undefined;
  self.dirty = false;
  self.currentProcessorId = null;
};

Pipeline.prototype.load = function (pipeline) {
  const self = this;

  while (self.processors.length > 0) {
    self.processors.pop();
  }

  pipeline.processors.forEach((processor) => {
    self.add(null, processor);
  });
};

Pipeline.prototype.remove = function (processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  processors.splice(index, 1);
};

Pipeline.prototype.moveUp = function (processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === 0) return;

  const temp = processors[index - 1];
  processors[index - 1] = processors[index];
  processors[index] = temp;
};

Pipeline.prototype.moveDown = function (processor) {
  const self = this;
  const processors = self.processors;
  const index = processors.indexOf(processor);

  if (index === processors.length - 1) return;

  const temp = processors[index + 1];
  processors[index + 1] = processors[index];
  processors[index] = temp;
};

function remove(array, arrayToRemove) {
  arrayToRemove.forEach((itemToRemove) => {
    _.remove(array, (o) => { return o === itemToRemove; });
  });
};

Pipeline.prototype.add = function (processorType, existingProcessor) {
  const self = this;
  const processors = self.processors;
  self.counter += 1;

  if (existingProcessor) {
    processorType = _.find(types, (o) => { return o.typeId === existingProcessor.typeId; });
  }

  const newProcessor = new Processor(processorType);

  if (existingProcessor) {
    const keys = _.keys(existingProcessor);
    remove(keys, ['title', 'template', 'typeId', 'processorId', 'outputObject', 'inputObject', 'description']);
    keys.forEach((key) => {
      _.set(newProcessor, key, _.get(existingProcessor, key));
    });
  }

  //Keep the processorId value a string. This is used as a property index.
  newProcessor.processorId = `processor_${self.counter}`;
  processors.push(newProcessor);
};

Pipeline.prototype.updateParents = function () {
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
};

Pipeline.prototype.getProcessorById = function (processorId) {
  const self = this;
  return _.find(self.processors, (processor) => {return processor.processorId === processorId; });
};

Pipeline.prototype.updateOutput = function () {
  const self = this;
  const processors = self.processors;

  self.output = undefined;
  if (processors.length > 0) {
    self.output = processors[processors.length - 1].outputObject;
  }
};
