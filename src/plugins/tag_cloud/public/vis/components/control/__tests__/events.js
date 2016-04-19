import _ from 'lodash';
import expect from 'expect.js';
import visFixture from 'plugins/tagcloud/vis/components/__tests__/fixtures/vis_fixture';
import remove from 'plugins/tagcloud/vis/components/__tests__/fixtures/remove';
import eventsFunction from 'plugins/tagcloud/vis/components/control/events';

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
