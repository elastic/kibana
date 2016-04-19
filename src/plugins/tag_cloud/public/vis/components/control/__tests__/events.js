// import eventsFunction from 'src/modules/component/events/events';
// import d3fixture from 'fixtures/fixture';
// import remove from 'fixtures/remove';
// import expect from 'expect.js';
//
// describe('events tests', function () {
//   let totalListenerCount;
//   let listeners;
//   let fixture;
//   let events;
//
//   beforeEach(function () {
//     fixture = d3fixture;
//     events = eventsFunction();
//     listeners = {
//       click: [function (e) { console.log(e); }],
//       brush: [function (brush) { return brush.extent(); }],
//       mouseover: [function (e, d) { return d; }]
//     };
//     totalListenerCount = 3;
//   });
//
//   afterEach(function () {
//     remove(fixture);
//   });
//
//   it('should return a function', function () {
//     chai.assert.isFunction(events);
//   });
//
//   describe('listeners API', function () {
//     afterEach(function () {
//       events.listeners({});
//     });
//
//     it('should return the listeners object', function () {
//       chai.assert.deepEqual(events.listeners(), {});
//     });
//
//     it('should set the listeners object', function () {
//       events.listeners(listeners); // Add listeners
//       chai.assert.deepEqual(events.listeners(), listeners);
//     });
//   });
// });
