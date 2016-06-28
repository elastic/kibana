
function keys(obj) {
  // non-itterables will throw here, but checking
  // typeof === "object" skips things like functions
  try { return Object.keys(obj); }
  catch (e) { return []; }
}

function own(obj, fn) {
  keys(obj).forEach(function (k) {
    fn(obj[k], k, obj);
  });
}

var toWrap = {
  stub: null,
  spy: null,
  useFakeTimers: function (clock) {
    // timeouts are indexed by their id in an array,
    // the holes make the .length property "wrong"
    clock.timeoutCount = function () {
      return clock.timeoutList().length;
    };

    clock.timeoutList = function () {
      return clock.timeouts ? clock.timeouts.filter(Boolean) : [];
    };
  }
};

function setupAutoRelease(actualSinon, afterEach) {
  var sinon = module.exports = Object.create(actualSinon);

  sinon.setupAutoRelease = setupAutoRelease;

  var toRestore = [];
  own(toWrap, function (modify, method) {
    var orig = sinon[method];
    sinon[method] = function () {
      var obj = orig.apply(sinon, arguments);

      // after each test this list is cleared
      if (obj.restore) toRestore.push(obj);

      if (typeof modify === 'function') modify(obj);

      return obj;
    };


    own(orig, function (val, name) {
      sinon[method][name] = val;
    });
  });

  afterEach(function () {
    toRestore.splice(0).forEach(function (obj) {
      obj.restore();
    });
  });

  return sinon;
}

module.exports = {
  setupAutoRelease: setupAutoRelease
};
