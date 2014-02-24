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
          if (typeof fn === 'function') {
            fn();
          } else {
            // partial args were supplied
            var args = fn;
            fn = args.shift();
            fn.apply(null, args);
          }
        }
      }
    }, true);

    return function nextTick(fn) {
      if (arguments.length > 1) {
        queue.push([fn].concat([].slice.call(arguments, 1)));
      } else {
        queue.push(fn);
      }
      window.postMessage('process-tick', '*');
    };
  }

  return function nextTick(fn) {
    setTimeout(fn, 0);
  };

});