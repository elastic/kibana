var test = require('tap').test;
var EventEmitter = require('events').EventEmitter;
var propagate = require('..');

test('propagates events', function(t) {
  t.plan(12);
  var ee1 = new EventEmitter();
  var ee2 = new EventEmitter();
  propagate(ee1, ee2);

  ee2.on('event-1', function(a, b, c) {
    t.equal(a, 'a');
    t.equal(b, 'b');
    t.equal(c, undefined);
  });

  ee2.on('event-2', function(a, b, c) {
    t.equal(a, 'c');
    t.equal(b, 'd');
    t.equal(c, undefined);
  });

  ee1.emit('event-1', 'a', 'b');
  ee1.emit('event-1', 'a', 'b');
  ee1.emit('event-2', 'c', 'd');
  ee1.emit('event-2', 'c', 'd');

});

test('propagates can end', function(t) {
  t.plan(1);

  var ee1 = new EventEmitter();
  var ee2 = new EventEmitter();
  var prop = propagate(ee1, ee2);

  ee2.on('event', function() {
    t.ok('true', 'propagated');
  });

  ee1.emit('event');
  prop.end();
  ee1.emit('event');
});

test('after propagation old one still emits', function(t) {
  t.plan(2);

  var ee1 = new EventEmitter();
  var ee2 = new EventEmitter();
  var prop = propagate(ee1, ee2);

  ee1.on('event', function() {
    t.ok('true', 'propagated');
  });

  ee1.emit('event');
  prop.end();
  ee1.emit('event');
});

test('is able to propagate only certain events', function(t) {
  t.plan(2);
  var ee1 = new EventEmitter();
  var ee2 = new EventEmitter();
  // propagate only event-1 and event-2, leaving out
  var p = propagate(['event-1', 'event-2'], ee1, ee2);

  ee2.on('event-1', function() {
    t.ok(true, 'event 1 received');
  });

  ee2.on('event-2', function(a, b, c) {
    t.ok(true, 'event 2 received');
  });

  ee2.on('event-3', function(a, b, c) {
    t.ok(false, 'event 3 should not have been received');
  });

  ee1.emit('event-1');
  ee1.emit('event-2');
  ee1.emit('event-3');

  p.end();

  ee1.emit('event-1');
});