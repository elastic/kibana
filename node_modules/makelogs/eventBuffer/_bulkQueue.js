var async = require('async');
var Promise = require('bluebird');

var argv = require('../argv');
var client = require('../_client');
var _ = require('lodash');
var first = true;

module.exports = function (eventBuffer) {
  var queue = async.queue(function (events, done) {
    var body = [];
    var esBulkQueueOverflow = 0;

    if (first) {
      argv.startedIndexing();
      first = false;
    }

    events.forEach(function (event) {
      body.push({ index: event.header }, event.body);
    });

    Promise.resolve(client.usable)
    .then(function () {
      if (body.length) {
        argv.log('sending', body.length / 2, 'bulk requests');
        return client.bulk({
          body: body
        });
      } else {
        return {};
      }
    })
    .then(function (resp) {
      var eventCount = resp.items.length;
      if (resp.errors) {
        resp.items.forEach(function (item, i) {
          var error = (item.index || item.create).error;
          if (_.isPlainObject(error) && error.reason) {
            error = error.reason;
          }
          if (error) {
            eventCount -= 1;

            if (error.match(/^EsRejectedExecutionException/)) {
              esBulkQueueOverflow ++;
              eventBuffer.push(events[i]);
            } else {
              console.error(error);
              process.exit();
            }
          }
        });
      }

      argv.progress(eventCount);
    })
    .catch(function (err) {
      console.error(err.stack);
      throw err;
    })
    .finally(function () {
      if (esBulkQueueOverflow) {
        // pause for 10ms per queue overage
        queue.pause();
        setTimeout(function () {
          queue.resume();
        }, 10 * esBulkQueueOverflow);
      }
    })
    .nodeify(done);
  }, 1);

  queue.drain = function () {
    if (eventBuffer.final && eventBuffer.length === 0) {
      client.close();
      argv.doneIndexing();
    } else {
      eventBuffer.flush();
    }
  };

  return queue;
};
