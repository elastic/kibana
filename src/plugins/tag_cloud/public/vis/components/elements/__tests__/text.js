import _ from 'lodash';
import expect from 'expect.js';
import text from 'plugins/tagcloud/vis/components/elements/text';
import visFixture from 'plugins/tagcloud/vis/components/__tests__/fixtures/vis_fixture';
import dataGenerator from 'plugins/tagcloud/vis/components/__tests__/fixtures/data_generator';
import { remove, removeChildren } from 'plugins/tagcloud/vis/components/__tests__/fixtures/remove';

describe('text SVG tests', function () {
  let element = text();
  let fixture;

  beforeEach(function () {
    fixture = visFixture();
    fixture.datum(dataGenerator(10)).call(element);
  });

  afterEach(function () {
    remove(fixture);
  });

  it('should return a function', function () {
    expect(_.isFunction(element)).to.be(true);
  });

  describe('x API', function () {
    let defaultX;

    beforeEach(function () {
      removeChildren(fixture);
      defaultX = function (d) { return d.x; };
      element.x(defaultX);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.x(), defaultX)).to.be(true);
    });

    it('should set the property', function () {
      let newX = function (d) { return d.cx; };
      element.x(newX);
      expect(_.isEqual(element.x(), newX)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.x(defaultX);
      fixture.call(element);

      fixture.selectAll('text')
        .each(function (d) {
          expect(_.isEqual(this.getAttribute('x'), d.x)).to.be(true);
        });
    });
  });

  describe('y API', function () {
    let defaultY;

    beforeEach(function () {
      removeChildren(fixture);
      defaultY = function (d) { return d.y; };
      element.y(defaultY);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.y(), defaultY)).to.be(true);
    });

    it('should set the property', function () {
      let newY = function (d) { return d.cy; };
      element.y(newY);
      expect(_.isEqual(element.y(), newY)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.y(defaultY);
      fixture.call(element);

      fixture.selectAll('text')
        .each(function (d) {
          expect(_.isEqual(this.getAttribute('y'), d.y)).to.be(true);
        });
    });
  });

  describe('dx API', function () {
    let defaultDX;

    beforeEach(function () {
      removeChildren(fixture);
      defaultDX = function (d) { return d.x; };
      element.dx(defaultDX);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.dx(), defaultDX)).to.be(true);
    });

    it('should set the property', function () {
      let newDX = function (d) { return d.dx; };
      element.dx(newDX);
      expect(_.isEqual(element.dx(), newDX)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.dx(defaultDX);
      fixture.call(element);

      fixture.selectAll('text')
        .each(function (d) {
          expect(_.isEqual(this.getAttribute('dx'), d.x)).to.be(true);
        });
    });
  });

  describe('dy API', function () {
    let defaultDY;

    beforeEach(function () {
      removeChildren(fixture);
      defaultDY = function (d) { return d.y; };
      element.dy(defaultDY);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.dy(), defaultDY)).to.be(true);
    });

    it('should set the property', function () {
      let newDY = function (d) { return d.dy; };
      element.dy(newDY);
      expect(_.isEqual(element.dy(), newDY)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.dy(defaultDY);
      fixture.call(element);

      fixture.selectAll('text')
        .each(function (d) {
          expect(_.isEqual(this.getAttribute('dy'), d.y)).to.be(true);
        });
    });
  });

  describe('class API', function () {
    var defaultClass;

    beforeEach(function () {
      removeChildren(fixture);
      defaultClass = 'text';
      element.class(defaultClass);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.class(), defaultClass)).to.be(true);
    });

    it('should set the property', function () {
      element.class('test');
      expect(_.isEqual(element.class(), 'test')).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.class('text');
      fixture.call(element);

      fixture.selectAll('text')
        .each(function () {
          expect(_.isEqual(this.getAttribute('class'), element.class())).to.be(true);
        });
    });
  });

  describe('transform API', function () {
    let defaultTransform;
    let newTransform;

    beforeEach(function () {
      removeChildren(fixture);
      defaultTransform = 'translate(0,0)';
      newTransform = function () {
        return 'rotate(45)';
      };
    });

    it('should get the property', function () {
      element.transform(defaultTransform);
      expect(_.isEqual(element.transform(), defaultTransform)).to.be(true);
    });

    it('should set the property', function () {
      element.transform(newTransform);
      expect(_.isEqual(element.transform(), newTransform)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.transform(defaultTransform);
      fixture.call(element);

      fixture.selectAll('path')
        .each(function () {
          expect(_.isEqual(this.getAttribute('transform'), defaultTransform)).to.be(true);
        });
    });
  });

  describe('fill API', function () {
    let defaultFill = '#0000FF';

    beforeEach(function () {
      removeChildren(fixture);
      element.fill(defaultFill);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.fill(), defaultFill)).to.be(true);
    });

    it('should set the property', function () {
      let newFill = '#FF0000';
      element.fill(newFill);
      expect(_.isEqual(element.fill(), newFill)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.fill(defaultFill);
      fixture.call(element);

      fixture.selectAll('text')
        .each(function () {
          expect(_.isEqual(this.getAttribute('fill'), element.fill())).to.be(true);
        });
    });
  });

  describe('text API', function () {
    let defaultText = 'value';

    beforeEach(function () {
      removeChildren(fixture);
      element.text(defaultText);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.text(), defaultText)).to.be(true);
    });

    it('should set the property', function () {
      var newText = 'new value';
      element.text(newText);
      expect(_.isEqual(element.text(), newText)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.text(defaultText);
      fixture.call(element);

      fixture.selectAll('text')
        .each(function () {
          expect(_.isEqual(this.innerHTML, element.text())).to.be(true);
        });
    });
  });

  describe('anchor API', function () {
    let defaultAnchor = 'middle';

    beforeEach(function () {
      removeChildren(fixture);
      element.anchor(defaultAnchor);
    });

    it('should get the property', function () {
      expect(_.isEqual(element.anchor(), defaultAnchor)).to.be(true);
    });

    it('should set the property', function () {
      let newAnchor = 'start';
      element.anchor(newAnchor);
      expect(_.isEqual(element.anchor(), newAnchor)).to.be(true);
    });

    it('should set the proper value of the DOM attribute', function () {
      element.anchor(defaultAnchor);
      fixture.call(element);

      fixture.selectAll('text')
        .each(function () {
          expect(_.isEqual(this.style['text-anchor'], element.anchor())).to.be(true);
        });
    });
  });
});
