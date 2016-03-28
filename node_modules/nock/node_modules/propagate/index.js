function propagate(events, source, dest) {
  if (arguments.length < 3) {
    dest = source;
    source = events;
    events = undefined;
  }

  // events should be an array
  if (events && ! Array.isArray(events)) events = [events];

  if (Array.isArray(events)) {
    return explicitPropagate(events, source, dest);
  }

  var oldEmit =  source.emit;

  source.emit = function(eventType) {
    if (! events || ~events.indexOf(eventType)) {
      dest.emit.apply(dest, arguments);
    }
    oldEmit.apply(source, arguments);
  }

  function end() {
    source.emit = oldEmit;
  }

  return {
    end: end
  };
};

module.exports = propagate;

function explicitPropagate(events, source, dest) {

  var listeners = events.map(function(event) {
    return function() {
      var args = Array.prototype.slice(arguments);
      args.unshift(event);
      dest.emit.apply(dest, args);
    }
  });

  listeners.forEach(register);

  return {
    end: end
  };

  function register(listener, i) {
    source.on(events[i], listener);
  }

  function unregister(listener, i) {
    source.removeListener(events[i], listener);
  }

  function end() {
    listeners.forEach(unregister);
  }
}