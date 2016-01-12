var expect = require('expect.js');
var sinon = require('sinon');

var Pipeline = require('../../lib/processor_pipeline');

describe('processor pipeline', function() {

  describe('add', function() {

    it('should append new items to the processors collection', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let expected = [
        { value: "item1" },
        { value: "item2" },
        { value: "item3" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

  });

  describe('moveUp', function() {

    it('should be able to move an item up in the array', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[1];
      pipeline.moveUp(target);

      let expected = [
        { value: "item2" },
        { value: "item1" },
        { value: "item3" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

    it('should be able to move the same item move than once', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[2];
      pipeline.moveUp(target);
      pipeline.moveUp(target);

      let expected = [
        { value: "item3" },
        { value: "item1" },
        { value: "item2" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

    it('should not move the selected item past the top', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[2];
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);
      pipeline.moveUp(target);

      let expected = [
        { value: "item3" },
        { value: "item1" },
        { value: "item2" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

    it('should not allow the top item to be moved up', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[0];
      pipeline.moveUp(target);

      let expected = [
        { value: "item1" },
        { value: "item2" },
        { value: "item3" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

  });

  describe('moveDown', function() {

    it('should be able to move an item down in the array', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[1];
      pipeline.moveDown(target);

      let expected = [
        { value: "item1" },
        { value: "item3" },
        { value: "item2" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

    it('should be able to move the same item move than once', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[0];
      pipeline.moveDown(target);
      pipeline.moveDown(target);

      let expected = [
        { value: "item2" },
        { value: "item3" },
        { value: "item1" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

    it('should not move the selected item past the bottom', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[0];
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);
      pipeline.moveDown(target);

      let expected = [
        { value: "item2" },
        { value: "item3" },
        { value: "item1" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

    it('should not allow the bottom item to be moved down', function () {
      let pipeline = new Pipeline();
      pipeline.add({ value: "item1" });
      pipeline.add({ value: "item2" });
      pipeline.add({ value: "item3" });

      let target = pipeline.processors[2];
      pipeline.moveDown(target);

      let expected = [
        { value: "item1" },
        { value: "item2" },
        { value: "item3" }
      ];
      expect(pipeline.processors).to.eql(expected);
    });

  });


});
