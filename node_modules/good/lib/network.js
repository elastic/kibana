// Load modules

var Hoek = require('hoek');
var Items = require('items');


// Declare internals

var internals = {};


module.exports.Monitor = internals.NetworkMonitor = function (server) {

    this._requests = {};
    this._responseTimes = {};
    this._server = server;

    this._server.on('request-internal', this._onRequest.bind(this));
    this._server.on('response', this._onResponse.bind(this));
};


internals.NetworkMonitor.prototype._onRequest = function (request, event, tags) {

    var self = this;
    var port = request.connection.info.port;

    if (tags.received) {
        this._requests[port] = this._requests[port] || { total: 0, disconnects: 0, statusCodes: {} };
        this._requests[port].total++;

        request.once('disconnect', function () {

            self._requests[port].disconnects++;
        });
    }
};


internals.NetworkMonitor.prototype._onResponse = function (request) {

    var msec = Date.now() - request.info.received;
    var port = request.connection.info.port;
    var statusCode = request.response && request.response.statusCode;

    this._responseTimes[port] = this._responseTimes[port] || { count: 0, total: 0, max: 0 };
    this._responseTimes[port].count++;
    this._responseTimes[port].total += msec;

    if (this._responseTimes[port].max < msec) {
        this._responseTimes[port].max = msec;
    }

    if (statusCode) {
        this._requests[port].statusCodes[statusCode] = this._requests[port].statusCodes[statusCode] || 0;
        this._requests[port].statusCodes[statusCode]++;
    }
};


internals.NetworkMonitor.prototype.reset = function () {

    var ports = Object.keys(this._requests);
    for (var i = 0, il = ports.length; i < il; ++i) {
        this._requests[ports[i]] = { total: 0, disconnects: 0, statusCodes: {} };
        this._responseTimes[ports[i]] = { count: 0, total: 0, max: 0 };
    }
};


internals.NetworkMonitor.prototype.requests = function (callback) {

    callback(null, this._requests);
};


internals.NetworkMonitor.prototype.concurrents = function (callback) {

    var self = this;
    var result = {};

    Items.serial(self._server.connections, function (connection, next) {

        connection.listener.getConnections(function (err, count) {

            if (err) {
                return next(err);
            }

            result[connection.info.port] = count;
            next();
        });
    }, function (err) {

        callback(err, result);
    });
};


internals.NetworkMonitor.prototype.responseTimes = function (callback) {


    var ports = Object.keys(this._responseTimes);
    var overview = {};
    for (var i = 0, il = ports.length; i < il; ++i) {
        var port = ports[i];
        var count = Hoek.reach(this, '_responseTimes.' + port + '.count', { default: 1 });
        overview[port] = {
            avg: this._responseTimes[port].total / count,
            max: this._responseTimes[port].max
        };
    }

    return callback(null, overview);
};


internals.NetworkMonitor.prototype.sockets = function (httpAgents, httpsAgents, callback) {

    var result = {
        http: internals.getSocketCount(httpAgents),
        https: internals.getSocketCount(httpsAgents)
    };
    callback(null, result);
};


internals.getSocketCount = function (agents) {

    var result = {
        total: 0
    };

    for (var j = 0, jl = agents.length; j < jl; ++j) {
        var agent = agents[j];

        var keys = Object.keys(agent.sockets);
        for (var i = 0, il = keys.length; i < il; ++i) {
            var key = keys[i];
            result[key] = agent.sockets[key].length;
            result.total += result[key];
        }
    }

    return result;
};
