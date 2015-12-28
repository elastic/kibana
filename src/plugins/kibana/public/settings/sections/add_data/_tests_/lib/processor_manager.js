var expect = require('expect.js');
var sinon = require('sinon');

var ProcessorManager = require('../../lib/processor_manager');

describe('processor manager', function() {

  describe('add', function() {

    it('should append new items to the processors collection', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let expected = [
        { value: "item1" },
        { value: "item2" },
        { value: "item3" }
      ];
      expect(manager.processors).to.eql(expected);
    });

  });

  describe('moveUp', function() {

    it('should be able to move an item up in the array', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[1];
      manager.moveUp(target);

      let expected = [
        { value: "item2" },
        { value: "item1" },
        { value: "item3" }
      ];
      expect(manager.processors).to.eql(expected);
    });

    it('should be able to move the same item move than once', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[2];
      manager.moveUp(target);
      manager.moveUp(target);

      let expected = [
        { value: "item3" },
        { value: "item1" },
        { value: "item2" }
      ];
      expect(manager.processors).to.eql(expected);
    });

    it('should not move the selected item past the top', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[2];
      manager.moveUp(target);
      manager.moveUp(target);
      manager.moveUp(target);
      manager.moveUp(target);
      manager.moveUp(target);

      let expected = [
        { value: "item3" },
        { value: "item1" },
        { value: "item2" }
      ];
      expect(manager.processors).to.eql(expected);
    });

    it('should not allow the top item to be moved up', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[0];
      manager.moveUp(target);

      let expected = [
        { value: "item1" },
        { value: "item2" },
        { value: "item3" }
      ];
      expect(manager.processors).to.eql(expected);
    });

  });

  describe('moveDown', function() {

    it('should be able to move an item down in the array', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[1];
      manager.moveDown(target);

      let expected = [
        { value: "item1" },
        { value: "item3" },
        { value: "item2" }
      ];
      expect(manager.processors).to.eql(expected);
    });

    it('should be able to move the same item move than once', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[0];
      manager.moveDown(target);
      manager.moveDown(target);

      let expected = [
        { value: "item2" },
        { value: "item3" },
        { value: "item1" }
      ];
      expect(manager.processors).to.eql(expected);
    });

    it('should not move the selected item past the bottom', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[0];
      manager.moveDown(target);
      manager.moveDown(target);
      manager.moveDown(target);
      manager.moveDown(target);
      manager.moveDown(target);

      let expected = [
        { value: "item2" },
        { value: "item3" },
        { value: "item1" }
      ];
      expect(manager.processors).to.eql(expected);
    });

    it('should not allow the bottom item to be moved down', function () {
      let manager = new ProcessorManager();
      manager.add({ value: "item1" });
      manager.add({ value: "item2" });
      manager.add({ value: "item3" });

      let target = manager.processors[2];
      manager.moveDown(target);

      let expected = [
        { value: "item1" },
        { value: "item2" },
        { value: "item3" }
      ];
      expect(manager.processors).to.eql(expected);
    });

  });


});
