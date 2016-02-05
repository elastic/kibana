const _ = require('lodash');

export default function Pipeline(processorTypes, Processor) {
  const self = this;

  self.processors = [];
  self.counter = 0;
  self.input = {};
  self.output = undefined;
  self.dirty = false;
  self.Processor = Processor;
  self.processorTypes = processorTypes;
};

Pipeline.prototype.load = function (pipeline) {
  const self = this;

  while (self.processors.length > 0) {
    self.processors.pop();
  }

  pipeline.processors.forEach((processor) => {
    self.addExisting(processor);
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

Pipeline.prototype.addExisting = function (existingProcessor) {
  const self = this;
  const processors = self.processors;

  const processorType = _.find(self.processorTypes, (o) => { return o.typeId === existingProcessor.typeId; });
  const newProcessor = self.add(processorType);

  const keys = _.keys(existingProcessor);
  remove(keys, ['title', 'template', 'typeId', 'processorId', 'outputObject', 'inputObject', 'description']);
  keys.forEach((key) => {
    _.set(newProcessor, key, _.get(existingProcessor, key));
  });

  return newProcessor;
};

Pipeline.prototype.add = function (processorType) {
  const self = this;
  const processors = self.processors;

  const newProcessor = new self.Processor(processorType);

  self.counter += 1;
  newProcessor.processorId = `processor_${self.counter}`;
  processors.push(newProcessor);

  return newProcessor;
};

Pipeline.prototype.updateParents = function () {
  const self = this;
  const processors = self.processors;

  processors.forEach((processor, index) => {
    let newParent;
    if (index === 0) {
      newParent = self.input;
    } else {
      newParent = processors[index - 1];
    }

    processor.setParent(newParent);
  });
};

Pipeline.prototype.updateOutput = function () {
  const self = this;
  const processors = self.processors;

  self.output = undefined;
  if (processors.length > 0) {
    self.output = processors[processors.length - 1].outputObject;
  }
};

Pipeline.prototype.getProcessorById = function (processorId) {
  const self = this;
  return _.find(self.processors, (processor) => { return processor.processorId === processorId; });
};

// Updates the state of the pipeline and processors with the results
// from an ingest simulate call.
Pipeline.prototype.applySimulateResults = function (results) {
  const self = this;

  //update the outputObject of each processor
  results.forEach((result) => {
    const processor = self.getProcessorById(result.processorId);

    processor.outputObject = _.get(result, 'output');
    processor.error = _.get(result, 'error');
  });

  //update the inputObject of each processor
  results.forEach((result) => {
    const processor = self.getProcessorById(result.processorId);

    //we don't want to change the inputObject if the parent processor
    //is in error because that can cause us to lose state.
    if (!_.get(processor, 'error.isNested')) {
      if (processor.parent.processorId) {
        processor.inputObject = _.cloneDeep(processor.parent.outputObject);
      } else {
        processor.inputObject = _.cloneDeep(processor.parent);
      }
    }

    processor.updateDescription();
  });

  self.updateOutput();
  self.dirty = false;
};
