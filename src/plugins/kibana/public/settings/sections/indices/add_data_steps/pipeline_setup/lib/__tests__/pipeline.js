import _ from 'lodash';
import expect from 'expect.js';
import Pipeline from '../../lib/pipeline';

function Processor(processorType) {
  const self = this;

  _.merge(self, processorType);
};

describe('processor pipeline', function () {

  describe('remove', function () {

    it('remove the specified processor from the processors collection', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      pipeline.remove(pipeline.processors[1]);

      expect(pipeline.processors[0].value).to.be('item1');
      expect(pipeline.processors[1].value).to.be('item3');
    });

  });

  describe('add', function () {

    it('should append new items to the processors collection', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      expect(pipeline.processors[0].value).to.be('item1');
      expect(pipeline.processors[1].value).to.be('item2');
      expect(pipeline.processors[2].value).to.be('item3');
    });

    it('should append assign each new processor a unique processorId', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const ids =  pipeline.processors.map((p) => { return p.processorId; });
      expect(_.uniq(ids).length).to.be(3);
    });

    it('added processors should be an instance of the type supplied in constructor', function () {
      function SomeClass() {
        this.someProperty = 'foo';
      }

      const pipeline = new Pipeline(null, SomeClass);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      expect(pipeline.processors[0]).to.have.property('someProperty');
      expect(pipeline.processors[1]).to.have.property('someProperty');
      expect(pipeline.processors[2]).to.have.property('someProperty');
    });

  });

  describe('moveUp', function () {

    it('should be able to move an item up in the array', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[1];
      pipeline.moveUp(target);

      expect(pipeline.processors[0].value).to.be('item2');
      expect(pipeline.processors[1].value).to.be('item1');
      expect(pipeline.processors[2].value).to.be('item3');
    });

    it('should be able to move the same item move than once', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[2];
      pipeline.moveUp(target);
      pipeline.moveUp(target);

      expect(pipeline.processors[0].value).to.be('item3');
      expect(pipeline.processors[1].value).to.be('item1');
      expect(pipeline.processors[2].value).to.be('item2');
    });

    it('should not move the selected item past the top', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[2];
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);

      expect(pipeline.processors[0].value).to.be('item3');
      expect(pipeline.processors[1].value).to.be('item1');
      expect(pipeline.processors[2].value).to.be('item2');
    });

    it('should not allow the top item to be moved up', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[0];
      pipeline.moveUp(target);

      expect(pipeline.processors[0].value).to.be('item1');
      expect(pipeline.processors[1].value).to.be('item2');
      expect(pipeline.processors[2].value).to.be('item3');
    });

  });

  describe('moveDown', function () {

    it('should be able to move an item down in the array', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[1];
      pipeline.moveDown(target);

      expect(pipeline.processors[0].value).to.be('item1');
      expect(pipeline.processors[1].value).to.be('item3');
      expect(pipeline.processors[2].value).to.be('item2');
    });

    it('should be able to move the same item move than once', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[0];
      pipeline.moveDown(target);
      pipeline.moveDown(target);

      expect(pipeline.processors[0].value).to.be('item2');
      expect(pipeline.processors[1].value).to.be('item3');
      expect(pipeline.processors[2].value).to.be('item1');
    });

    it('should not move the selected item past the bottom', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[0];
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);

      expect(pipeline.processors[0].value).to.be('item2');
      expect(pipeline.processors[1].value).to.be('item3');
      expect(pipeline.processors[2].value).to.be('item1');
    });

    it('should not allow the bottom item to be moved down', function () {
      const pipeline = new Pipeline(null, Processor);
      pipeline.add({ value: 'item1' });
      pipeline.add({ value: 'item2' });
      pipeline.add({ value: 'item3' });

      const target = pipeline.processors[2];
      pipeline.moveDown(target);

      expect(pipeline.processors[0].value).to.be('item1');
      expect(pipeline.processors[1].value).to.be('item2');
      expect(pipeline.processors[2].value).to.be('item3');
    });

  });


});
