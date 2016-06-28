// Load modules

var Os = require('os');
var Utils = require('./utils');


// Declare internals

var internals = {};


module.exports = internals;

internals.mem = Utils.makeContinuation(function () {

    return {
        total: Os.totalmem(),
        free: Os.freemem()
    };
});

internals.loadavg = Utils.makeContinuation(Os.loadavg);

internals.uptime = Utils.makeContinuation(Os.uptime);
