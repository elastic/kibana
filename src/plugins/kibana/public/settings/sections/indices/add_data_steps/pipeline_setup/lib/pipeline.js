import _ from 'lodash';

function updateProcessorOutputs(pipeline, simulateResults) {
  simulateResults.forEach((result) => {
    const processor = pipeline.getProcessorById(result.processorId);

    if (!processor.new) {
      processor.outputObject = _.get(result, 'output');
      processor.error = _.get(result, 'error');
    }
  });
}

//Updates the error state of the pipeline and its processors
//If a pipeline compile error is returned, lock all processors but the error
//If a pipeline data error is returned, lock all processors after the error
function updateErrorState(pipeline) {
  pipeline.hasCompileError = _.some(pipeline.processors, (processor) => {
    return _.get(processor, 'error.compile');
  });
  _.forEach(pipeline.processors, processor => {
    processor.locked = false;
  });

  const errorIndex = _.findIndex(pipeline.processors, 'error');
  if (errorIndex === -1) return;

  _.forEach(pipeline.processors, (processor, index) => {
    if (pipeline.hasCompileError && index !== errorIndex) {
      processor.locked = true;
    }
    if (!pipeline.hasCompileError && index > errorIndex) {
      processor.locked = true;
    }
  });
}

function updateProcessorInputs(pipeline) {
  pipeline.processors.forEach((processor) => {
    //we don't want to change the inputObject if the parent processor
    //is in error because that can cause us to lose state.
    if (!_.get(processor, 'parent.error')) {
      //the parent property of the first processor is set to the pipeline.input.
      //In all other cases it is set to processor[index-1]
      if (!processor.parent.processorId) {
        processor.inputObject = _.cloneDeep(processor.parent);
      } else {
        processor.inputObject = _.cloneDeep(processor.parent.outputObject);
      }
    }
  });
}


export default class Pipeline {

  constructor() {
    this.processors = [];
    this.processorCounter = 0;
    this.input = {};
    this.output = undefined;
    this.dirty = false;
    this.hasCompileError = false;
  }

  get model() {
    const pipeline = {
      input: this.input,
      processors: _.map(this.processors, processor => processor.model)
    };
    return pipeline;
  }

  setDirty() {
    this.dirty = true;
  }

  load(pipeline) {
    this.processors = [];
    pipeline.processors.forEach((processor) => {
      this.addExisting(processor);
    });
  }

  remove(processor) {
    const processors = this.processors;
    const index = processors.indexOf(processor);

    processors.splice(index, 1);
  }

  moveUp(processor) {
    const processors = this.processors;
    const index = processors.indexOf(processor);

    if (index === 0) return;

    const temp = processors[index - 1];
    processors[index - 1] = processors[index];
    processors[index] = temp;
  }

  moveDown(processor) {
    const processors = this.processors;
    const index = processors.indexOf(processor);

    if (index === processors.length - 1) return;

    const temp = processors[index + 1];
    processors[index + 1] = processors[index];
    processors[index] = temp;
  }

  addExisting(oldProcessor) {
    const Type = oldProcessor.constructor;
    const newProcessor = this.add(Type, oldProcessor.model);
    newProcessor.collapsed = true;
    newProcessor.new = false;

    return newProcessor;
  }

  add(ProcessorType, oldProcessor) {
    const processors = this.processors;

    this.processorCounter += 1;
    const processorId = `processor_${this.processorCounter}`;
    const newProcessor = new ProcessorType(processorId, oldProcessor);
    processors.push(newProcessor);

    return newProcessor;
  }

  updateParents() {
    const processors = this.processors;

    processors.forEach((processor, index) => {
      let newParent;
      if (index === 0) {
        newParent = this.input;
      } else {
        newParent = processors[index - 1];
      }

      processor.setParent(newParent);
    });
    this.dirty = true;
  }

  getProcessorById(processorId) {
    const result = _.find(this.processors, { processorId });

    if (!result) {
      throw new Error(`Could not find processor by id [${processorId}]`);
    }

    return result;
  }

  updateOutput() {
    const processors = _.reject(this.processors, { new: true });

    const errorIndex = _.findIndex(processors, 'error');
    const goodProcessor = errorIndex === -1 ? _.last(processors) : processors[errorIndex - 1];
    this.output = goodProcessor ? goodProcessor.outputObject : this.input;

    this.dirty = false;
  }

  // Updates the state of the pipeline and processors with the results
  // from an ingest simulate call.
  applySimulateResults(simulateResults) {
    updateProcessorOutputs(this, simulateResults);
    updateErrorState(this);
    updateProcessorInputs(this);
    this.updateOutput();
  }

}
