import _ from 'lodash';

export default class Pipeline {

  constructor() {
    this.processors = [];
    this.processorCounter = 0;
    this.input = {};
    this.output = undefined;
    this.dirty = false;
    this.hasCompileError = false;
    this.dirtyProcessor = undefined;
  }

  get model() {
    const pipeline = {
      input: this.input,
      processors: _.map(this.processors, processor => processor.model),
      dirtyProcessorId: _.get(this.dirtyProcessor, 'processorId')
    };
    return pipeline;
  }

  setDirty(processor) {
    this.dirty = true;
    this.dirtyProcessor = processor;
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

  addExisting(existingProcessor) {
    const Type = existingProcessor.constructor;
    const newProcessor = this.add(Type);
    _.assign(newProcessor, _.omit(existingProcessor, 'processorId'));

    return newProcessor;
  }

  add(ProcessorType) {
    const processors = this.processors;

    this.processorCounter += 1;
    const processorId = `processor_${this.processorCounter}`;
    const newProcessor = new ProcessorType(processorId);
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

  _updateProcessorOutputs(simulateResults) {
    simulateResults.forEach((result) => {
      const processor = this.getProcessorById(result.processorId);

      processor.outputObject = _.get(result, 'output');
      processor.error = _.get(result, 'error');
    });
  }

  //Updates the error state of the pipeline and its processors
  //If a pipeline compile error is returned, lock all processors but the error
  //If a pipeline data error is returned, lock all processors after the error
  _updateErrorState() {
    this.hasCompileError = _.some(this.processors, (processor) => {
      return _.get(processor, 'error.compile');
    });
    _.forEach(this.processors, processor => {
      processor.locked = false;
    });

    const errorIndex = _.findIndex(this.processors, 'error');
    if (errorIndex === -1) return;

    _.forEach(this.processors, (processor, index) => {
      if (this.hasCompileError && index !== errorIndex) {
        processor.locked = true;
      }
      if (!this.hasCompileError && index > errorIndex) {
        processor.locked = true;
      }
    });
  }

  _updateProcessorInputs() {
    this.processors.forEach((processor) => {
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

  updateOutput() {
    const processors = this.processors;

    this.output = undefined;
    if (processors.length > 0) {
      this.output = processors[processors.length - 1].outputObject;
    }
    this.dirty = false;
  }

  // Updates the state of the pipeline and processors with the results
  // from an ingest simulate call.
  applySimulateResults(simulateResults) {
    this._updateProcessorOutputs(simulateResults);
    this._updateErrorState();
    this._updateProcessorInputs();
    this.updateOutput();
  }

}
