import _ from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';
import Pipeline from '../pipeline';
import * as processorTypes from '../../processors/view_models';

describe('processor pipeline', function () {

  function getProcessorIds(pipeline) {
    return pipeline.processors.map(p => p.processorId);
  }

  describe('model', function () {

    it('should only contain the clean data properties', function () {
      const pipeline = new Pipeline();
      const actual = pipeline.model;
      const expectedKeys = [ 'input', 'processors' ];

      expect(_.keys(actual)).to.eql(expectedKeys);
    });

    it('should access the model property of each processor', function () {
      const pipeline = new Pipeline();
      pipeline.input = { foo: 'bar' };
      pipeline.add(processorTypes.Set);

      const actual = pipeline.model;
      const expected = {
        input: pipeline.input,
        processors: [ pipeline.processors[0].model ]
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('load', function () {

    it('should remove existing processors from the pipeline', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const oldProcessors = [ pipeline.processors[0], pipeline.processors[1], pipeline.processors[2] ];

      const newPipeline = new Pipeline();
      newPipeline.add(processorTypes.Set);
      newPipeline.add(processorTypes.Set);
      newPipeline.add(processorTypes.Set);

      pipeline.load(newPipeline);

      expect(_.find(pipeline.processors, oldProcessors[0])).to.be(undefined);
      expect(_.find(pipeline.processors, oldProcessors[1])).to.be(undefined);
      expect(_.find(pipeline.processors, oldProcessors[2])).to.be(undefined);
    });

    it('should call addExisting for each of the imported processors', function () {
      const pipeline = new Pipeline();
      sinon.stub(pipeline, 'addExisting');

      const newPipeline = new Pipeline();
      newPipeline.add(processorTypes.Set);
      newPipeline.add(processorTypes.Set);
      newPipeline.add(processorTypes.Set);

      pipeline.load(newPipeline);

      expect(pipeline.addExisting.calledWith(newPipeline.processors[0])).to.be(true);
      expect(pipeline.addExisting.calledWith(newPipeline.processors[1])).to.be(true);
      expect(pipeline.addExisting.calledWith(newPipeline.processors[2])).to.be(true);
    });

  });

  describe('remove', function () {

    it('remove the specified processor from the processors collection', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      const processorIds = getProcessorIds(pipeline);

      pipeline.remove(pipeline.processors[1]);

      expect(pipeline.processors[0].processorId).to.be(processorIds[0]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[2]);
    });

  });

  describe('add', function () {

    it('should append new items to the processors collection', function () {
      const pipeline = new Pipeline();

      expect(pipeline.processors.length).to.be(0);

      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      expect(pipeline.processors.length).to.be(3);
    });

    it('should append assign each new processor a unique processorId', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      const ids =  pipeline.processors.map((p) => { return p.processorId; });
      expect(_.uniq(ids).length).to.be(3);
    });

    it('added processors should be an instance of the type supplied', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      expect(pipeline.processors[0] instanceof processorTypes.Set).to.be(true);
      expect(pipeline.processors[1] instanceof processorTypes.Set).to.be(true);
      expect(pipeline.processors[2] instanceof processorTypes.Set).to.be(true);
    });

  });

  describe('addExisting', function () {

    it('should append new items to the processors collection', function () {
      const pipeline = new Pipeline();

      expect(pipeline.processors.length).to.be(0);

      const testProcessor = new processorTypes.Set('foo');

      pipeline.addExisting(testProcessor);

      expect(pipeline.processors.length).to.be(1);
    });

    it('should instantiate an object of the same class as the object passed in', function () {
      const pipeline = new Pipeline();

      const testProcessor = new processorTypes.Set('foo');

      pipeline.addExisting(testProcessor);

      expect(pipeline.processors[0] instanceof processorTypes.Set).to.be(true);
    });

    it('the object added should be a different instance than the object passed in', function () {
      const pipeline = new Pipeline();

      const testProcessor = new processorTypes.Set('foo');

      pipeline.addExisting(testProcessor);

      expect(pipeline.processors[0]).to.not.be(testProcessor);
    });

    it('the object added should have the same property values as the object passed in (except id)', function () {
      const pipeline = new Pipeline();

      const testProcessor = new processorTypes.Set('foo');
      testProcessor.targetField = 'bar';
      testProcessor.value = 'baz';
      testProcessor.invalid_property = 'bop';

      pipeline.addExisting(testProcessor);

      expect(pipeline.processors[0].targetField).to.be('bar');
      expect(pipeline.processors[0].value).to.be('baz');
      expect(pipeline.processors[0].invalid_property).to.be(undefined);
      expect(pipeline.processors[0].processorId).to.not.be('foo');
    });

  });

  describe('moveUp', function () {

    it('should be able to move an item up in the array', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[1];
      pipeline.moveUp(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[1]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[0]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[2]);
    });

    it('should be able to move the same item move than once', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[2];
      pipeline.moveUp(target);
      pipeline.moveUp(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[2]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[0]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[1]);
    });

    it('should not move the selected item past the top', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[2];
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[2]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[0]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[1]);
    });

    it('should not allow the top item to be moved up', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[0];
      pipeline.moveUp(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[0]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[1]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[2]);
    });

  });

  describe('moveDown', function () {

    it('should be able to move an item down in the array', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[1];
      pipeline.moveDown(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[0]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[2]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[1]);
    });

    it('should be able to move the same item move than once', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[0];
      pipeline.moveDown(target);
      pipeline.moveDown(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[1]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[2]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[0]);
    });

    it('should not move the selected item past the bottom', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[0];
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[1]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[2]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[0]);
    });

    it('should not allow the bottom item to be moved down', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const target = pipeline.processors[2];
      pipeline.moveDown(target);

      expect(pipeline.processors[0].processorId).to.be(processorIds[0]);
      expect(pipeline.processors[1].processorId).to.be(processorIds[1]);
      expect(pipeline.processors[2].processorId).to.be(processorIds[2]);
    });

  });

  describe('updateParents', function () {

    it('should set the first processors parent to pipeline.input', function () {
      const pipeline = new Pipeline();
      pipeline.input = { foo: 'bar' };

      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      pipeline.processors.forEach(p => sinon.stub(p, 'setParent'));

      pipeline.updateParents();

      expect(pipeline.processors[0].setParent.calledWith(pipeline.input)).to.be(true);
    });

    it('should set non-first processors parent to previous processor', function () {
      const pipeline = new Pipeline();
      pipeline.input = { foo: 'bar' };

      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      pipeline.processors.forEach(p => sinon.stub(p, 'setParent'));

      pipeline.updateParents();

      expect(pipeline.processors[1].setParent.calledWith(pipeline.processors[0])).to.be(true);
      expect(pipeline.processors[2].setParent.calledWith(pipeline.processors[1])).to.be(true);
      expect(pipeline.processors[3].setParent.calledWith(pipeline.processors[2])).to.be(true);
    });

    it('should set pipeline.dirty', function () {
      const pipeline = new Pipeline();
      pipeline.updateParents();

      expect(pipeline.dirty).to.be(true);
    });

  });

  describe('getProcessorById', function () {

    it('should return a processor when suppied its id', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      const processorIds = getProcessorIds(pipeline);

      const actual = pipeline.getProcessorById(processorIds[2]);
      const expected = pipeline.processors[2];

      expect(actual).to.be(expected);
    });

    it('should throw an error if given an unknown id', function () {
      const pipeline = new Pipeline();

      expect(pipeline.getProcessorById).withArgs('foo').to.throwError();
    });

  });

  describe('updateOutput', function () {

    it('should set the output to input if first processor has error', function () {
      const pipeline = new Pipeline();
      pipeline.input = { bar: 'baz' };
      pipeline.add(processorTypes.Set);

      pipeline.processors[0].new = false;
      pipeline.processors[0].outputObject = { field1: 'value1' };
      pipeline.processors[0].error = {}; //define an error

      _.map(pipeline.processors, (processor) => { processor.new = false; });

      pipeline.updateOutput();
      expect(pipeline.output).to.be(pipeline.input);
    });

    it('should set the output to the processor before the error on a compile error', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      pipeline.processors[0].outputObject = { field1: 'value1' };
      pipeline.processors[1].outputObject = { field1: 'value2' };
      pipeline.processors[2].outputObject = { field1: 'value3' };

      _.map(pipeline.processors, (processor) => { processor.new = false; });

      pipeline.updateOutput();
      expect(pipeline.output).to.eql({ field1: 'value3' });

      pipeline.processors[1].error = { compile: true }; //define a compile error
      pipeline.processors[0].locked = true;             //all other processors get locked.
      pipeline.processors[2].locked = true;             //all other processors get locked.

      pipeline.updateOutput();
      expect(pipeline.output).to.eql({ field1: 'value1' });
    });

    it('should set the output to the last processor with valid output if a processor has an error', function () {
      const pipeline = new Pipeline();
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);
      pipeline.add(processorTypes.Set);

      pipeline.processors[0].outputObject = { field1: 'value1' };
      pipeline.processors[1].outputObject = { field1: 'value2' };
      pipeline.processors[2].outputObject = { field1: 'value3' };

      _.map(pipeline.processors, (processor) => { processor.new = false; });

      pipeline.updateOutput();
      expect(pipeline.output).to.eql({ field1: 'value3' });

      pipeline.processors[2].error = {}; //define an error
      pipeline.updateOutput();
      expect(pipeline.output).to.eql({ field1: 'value2' });

      pipeline.processors[1].error = {}; //define an error
      pipeline.processors[2].error = undefined; //if processor[1] has an error,
      pipeline.processors[2].locked = true;     //subsequent processors will be locked.
      pipeline.updateOutput();
      expect(pipeline.output).to.eql({ field1: 'value1' });
    });

    it('should set output to be last processor output if processors exist', function () {
      const pipeline = new Pipeline();
      pipeline.input = { bar: 'baz' };
      pipeline.add(processorTypes.Set);

      const expected = { foo: 'bar' };
      pipeline.processors[0].outputObject = expected;

      _.map(pipeline.processors, (processor) => { processor.new = false; });

      pipeline.updateOutput();
      expect(pipeline.output).to.be(expected);
    });

    it('should set output to be equal to input if no processors exist', function () {
      const pipeline = new Pipeline();
      pipeline.input = { bar: 'baz' };

      pipeline.updateOutput();
      expect(pipeline.output).to.be(pipeline.input);
    });

    it('should ignore new processors', function () {
      const pipeline = new Pipeline();
      pipeline.input = { bar: 'baz' };
      pipeline.add(processorTypes.Set);

      pipeline.updateOutput();
      expect(pipeline.output).to.be(pipeline.input);

      const expected = { field1: 'value1' };
      pipeline.processors[0].new = false;
      pipeline.processors[0].outputObject = expected;

      pipeline.add(processorTypes.Set);
      pipeline.processors[1].outputObject = { field1: 'value2' };

      pipeline.updateOutput();
      expect(pipeline.output).to.be(expected);
    });

    it('should set pipeline.dirty', function () {
      const pipeline = new Pipeline();
      pipeline.updateParents();
      expect(pipeline.dirty).to.be(true);

      pipeline.updateOutput();
      expect(pipeline.dirty).to.be(false);
    });

  });

  // describe('applySimulateResults', function () { });


});
