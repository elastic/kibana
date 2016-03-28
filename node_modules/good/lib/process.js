// Load modules

var Hoek = require('hoek');
var Utils = require('./utils');

// Declare internals

var internals = {};


module.exports = internals;


internals.delay = function (callback) {

    var bench = new Hoek.Bench();
    setImmediate(function () {

        return callback(null, bench.elapsed());
    });
};


internals.uptime = Utils.makeContinuation(process.uptime);


internals.memoryUsage = Utils.makeContinuation(process.memoryUsage);
