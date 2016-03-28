// Load modules
var Monitor = require('./monitor');

// Declare internals
var internals = {};


exports.register = function (server, options, next) {

    var monitor = new Monitor(server, options);
    server.expose('monitor', monitor);
    server.on('stop', function () {

        monitor.stop();
    });

    return monitor.start(next);
};

exports.register.attributes = {

    pkg: require('../package.json')
};
