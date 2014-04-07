var queue = require("../queue"),
    fs = require("fs"),
    vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("queue");

suite.addBatch({

  "version": {
    "is semantic": function() {
      assert.isTrue(/^([0-9]+)\.([0-9]+)\.([0-9]+)/.test(queue.version));
    }
  },

  "example queue of fs.stat": {
    topic: function() {
      queue()
          .defer(fs.stat, __dirname + "/../Makefile")
          .defer(fs.stat, __dirname + "/../README.md")
          .defer(fs.stat, __dirname + "/../package.json")
          .await(this.callback);
    },
    "does not fail": function(error, one, two, three) {
      assert.isNull(error);
    },
    "successfully executes the three tasks": function(error, one, two, three) {
      assert.greater(one.size, 0);
      assert.greater(two.size, 0);
      assert.greater(three.size, 0);
    }
  },

  "queue of single synchronous task that errors": {
    topic: function() {
      queue()
          .defer(function(callback) { callback(-1); })
          .await(this.callback);
    },
    "fails": function(error, result) {
      assert.equal(error, -1);
      assert.isUndefined(result);
    }
  },

  "queue of single asynchronous task that errors": {
    topic: function() {
      queue()
          .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
          .await(this.callback);
    },
    "fails": function(error, result) {
      assert.equal(error, -1);
      assert.isUndefined(result);
    }
  },

  "queue with multiple tasks that error": {
    topic: function() {
      queue()
          .defer(function(callback) { setTimeout(function() { callback(-2); }, 100); })
          .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
          .defer(function(callback) { setTimeout(function() { callback(-3); }, 200); })
          .await(this.callback);
    },
    "the first error is returned": function(error, one, two, three) {
      assert.equal(error, -1);
      assert.isUndefined(one);
      assert.isUndefined(two);
      assert.isUndefined(three);
    }
  },

  "queue with multiple tasks where one errors": {
    topic: function() {
      queue()
          .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
          .defer(function(callback) { process.nextTick(function() { callback(null, 'ok'); }); })
          .await(this.callback);
    },
    "the first error is returned": function(error, one, two) {
      assert.equal(error, -1);
      assert.isUndefined(one);
      assert.isUndefined(two);
    }
  },

  "queue with multiple synchronous tasks that error": {
    topic: function() {
      queue()
          .defer(function(callback) { callback(-1); })
          .defer(function(callback) { callback(-2); })
          .defer(function(callback) { throw new Error(); })
          .await(this.callback);
    },
    "the first error prevents the other tasks from running": function(error, one, two, three) {
      assert.equal(error, -1);
      assert.isUndefined(one);
      assert.isUndefined(two);
      assert.isUndefined(three);
    }
  },

  "queue of asynchronous closures, processed serially": {
    topic: function() {
      var tasks = [], task = asynchronousTask(), n = 10, q = queue(1);
      while (--n >= 0) tasks.push(task);
      tasks.forEach(function(t) { q.defer(t); });
      q.awaitAll(this.callback)
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [
        {active: 1, index: 0},
        {active: 1, index: 1},
        {active: 1, index: 2},
        {active: 1, index: 3},
        {active: 1, index: 4},
        {active: 1, index: 5},
        {active: 1, index: 6},
        {active: 1, index: 7},
        {active: 1, index: 8},
        {active: 1, index: 9}
      ]);
    }
  },

  "fully-parallel queue of ten asynchronous tasks": {
    topic: function() {
      var t = asynchronousTask();
      queue()
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in parallel": function(error, results) {
      assert.deepEqual(results, [
        {active: 10, index: 0},
        {active: 9, index: 1},
        {active: 8, index: 2},
        {active: 7, index: 3},
        {active: 6, index: 4},
        {active: 5, index: 5},
        {active: 4, index: 6},
        {active: 3, index: 7},
        {active: 2, index: 8},
        {active: 1, index: 9}
      ]);
    }
  },

  "partly-parallel queue of ten asynchronous tasks": {
    topic: function() {
      var t = asynchronousTask();
      queue(3)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes at most three tasks in parallel": function(error, results) {
      assert.deepEqual(results, [
        {active: 3, index: 0},
        {active: 3, index: 1},
        {active: 3, index: 2},
        {active: 3, index: 3},
        {active: 3, index: 4},
        {active: 3, index: 5},
        {active: 3, index: 6},
        {active: 3, index: 7},
        {active: 2, index: 8},
        {active: 1, index: 9}
      ]);
    }
  },

  "serialized queue of ten asynchronous tasks": {
    topic: function() {
      var t = asynchronousTask();
      queue(1)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [
        {active: 1, index: 0},
        {active: 1, index: 1},
        {active: 1, index: 2},
        {active: 1, index: 3},
        {active: 1, index: 4},
        {active: 1, index: 5},
        {active: 1, index: 6},
        {active: 1, index: 7},
        {active: 1, index: 8},
        {active: 1, index: 9}
      ]);
    }
  },

  "serialized queue of ten deferred synchronous tasks": {
    topic: function() {
      var t = deferredSynchronousTask();
      queue(1)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
      t.finish();
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series, within the callback of the first task": function(error, results) {
      assert.deepEqual(results, [
        {active: 1, index: 0},
        {active: 2, index: 1},
        {active: 2, index: 2},
        {active: 2, index: 3},
        {active: 2, index: 4},
        {active: 2, index: 5},
        {active: 2, index: 6},
        {active: 2, index: 7},
        {active: 2, index: 8},
        {active: 2, index: 9}
      ]);
    }
  },

  "partly-parallel queue of ten synchronous tasks": {
    topic: function() {
      var t = synchronousTask();
      queue(3)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [
        {active: 1, index: 0},
        {active: 1, index: 1},
        {active: 1, index: 2},
        {active: 1, index: 3},
        {active: 1, index: 4},
        {active: 1, index: 5},
        {active: 1, index: 6},
        {active: 1, index: 7},
        {active: 1, index: 8},
        {active: 1, index: 9}
      ]);
    }
  },

  "serialized queue of ten synchronous tasks": {
    topic: function() {
      var t = synchronousTask();
      queue(1)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [
        {active: 1, index: 0},
        {active: 1, index: 1},
        {active: 1, index: 2},
        {active: 1, index: 3},
        {active: 1, index: 4},
        {active: 1, index: 5},
        {active: 1, index: 6},
        {active: 1, index: 7},
        {active: 1, index: 8},
        {active: 1, index: 9}
      ]);
    }
  }

});

suite.export(module);

function asynchronousTask(counter) {
  var active = 0;

  if (!counter) counter = {scheduled: 0};

  return function(callback) {
    var index = counter.scheduled++;
    ++active;
    process.nextTick(function() {
      try {
        callback(null, {active: active, index: index});
      } finally {
        --active;
      }
    });
  };
}

function synchronousTask(counter) {
  var active = 0;

  if (!counter) counter = {scheduled: 0};

  return function(callback) {
    try {
      callback(null, {active: ++active, index: counter.scheduled++});
    } finally {
      --active;
    }
  };
}

function deferredSynchronousTask(counter) {
  var active = 0, deferrals = [];

  if (!counter) counter = {scheduled: 0};

  function task(callback) {
    if (deferrals) return deferrals.push({callback: callback, index: counter.scheduled++});
    try {
      callback(null, {active: ++active, index: counter.scheduled++});
    } finally {
      --active;
    }
  }

  task.finish = function() {
    var deferrals_ = deferrals.slice();
    deferrals = null;
    deferrals_.forEach(function(deferral) {
      try {
        deferral.callback(null, {active: ++active, index: deferral.index});
      } finally {
        --active;
      }
    });
  };

  return task;
}
