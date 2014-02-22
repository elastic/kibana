define(function () {

  var canSetImmediate = typeof window !== 'undefined' && window.setImmediate;
  var canPost = typeof window !== 'undefined' && window.postMessage && window.addEventListener
  ;

  if (canSetImmediate) {
    return function (f) { return window.setImmediate(f); };
  }

  if (canPost) {
    var queue = [];
    window.addEventListener('message', function (ev) {
      if (ev.source === window && ev.data === 'process-tick') {
        ev.stopPropagation();
        if (queue.length > 0) {
          var fn = queue.shift();
          fn();
        }
      }
    }, true);

    return function nextTick(fn) {
      queue.push(fn);
      window.postMessage('process-tick', '*');
    };
  }

  return function nextTick(fn) {
    setTimeout(fn, 0);
  };

});