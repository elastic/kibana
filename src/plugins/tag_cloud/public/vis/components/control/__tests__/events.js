import d3 from 'd3';
import _ from 'lodash';
import expect from 'expect.js';
import eventsFunction from 'plugins/tagcloud/vis/components/control/events';

function visFixture() {
  let div = document.createElement('div');
  let element = document.body.appendChild(div);

  element.setAttribute('style', 'position: relative');
  element.style.width = '500px';
  element.style.height = '500px';

  return element;
}

function remove(element) {
  let el = d3.select(element);
  el.remove();
  el = null;
}

describe('events tests', function () {
  let totalListenerCount;
  let listeners;
  let fixture;
  let events;

  beforeEach(function () {
    fixture = visFixture();
    events = eventsFunction();
    listeners = {
      click: [function (e) { console.log(e); }],
      mouseover: [function (e, d) { return d; }]
    };
    totalListenerCount = Object.keys(listeners).length;
  });

  afterEach(function () {
    remove(fixture);
  });

  it('should return a function', function () {
    expect(_.isFunction(events)).to.be(true);
  });

  describe('listeners API', function () {
    afterEach(function () {
      events.listeners({});
    });

    it('should return the listeners object', function () {
      expect(_.isEqual(events.listeners(), {})).to.be.ok();
    });

    it('should set the listeners object', function () {
      events.listeners(listeners); // Add listeners
      expect(_.isEqual(events.listeners(), listeners)).to.be.ok();
    });
  });
});
