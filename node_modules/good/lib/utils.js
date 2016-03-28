// Load modules

var Https = require('https');
var Hoek = require('hoek');
var Traverse = require('traverse');

// Declare internals

var internals = {};

internals.getOwnProperty = function (obj, key) {

    if (obj.hasOwnProperty(key)) {
        return obj[key];
    }
};

exports.makeContinuation = function (predicate) {

    return function (callback) {

        process.nextTick(function () {

            var result = predicate();
            callback(null, result);
        });
    };
};


// Payload for "log" events
exports.GreatLog = function (event) {

    if (this.constructor !== exports.GreatLog) {
        return new exports.GreatLog(event);
    }

    this.event = 'log';
    this.timestamp = event.timestamp;
    this.tags = event.tags;
    this.data = event.data;
    this.pid = process.pid;

    Object.freeze(this);
};


// Payload for "error" events
exports.GreatError = function (request, error) {

    if (this.constructor !== exports.GreatError) {
        return new exports.GreatError(request, error);
    }

    this.event = 'error';
    this.timestamp = request.info.received;
    this.id = request.id;
    this.url = request.url;
    this.method = request.method;
    this.pid = process.pid;
    this.error = error;

    Object.freeze(this);
};


exports.GreatError.prototype.toJSON = function () {

    var result = Hoek.clone(this);

    result.error = {
        message: this.error.message,
        stack: this.error.stack
    };

    return result;
};


// Payload for "response" events
exports.GreatResponse = function (request, options, filterRules) {

    if (this.constructor !== exports.GreatResponse) {
        return new exports.GreatResponse(request, options, filterRules);
    }

    var req = request.raw.req;
    var res = request.raw.res;

    var replacer = function (match, group) {

        return (new Array(group.length + 1).join('X'));
    };

    var applyFilter = function (data) {

        Traverse(data).forEach(function (value) {

            if (this.isRoot) {
                return;
            }

            if (this.isLeaf) {
                var filter = internals.getOwnProperty(filterRules, this.key) || internals.getOwnProperty(filterRules, this.parent.key);

                if (filter) {
                    filter = filter.toLowerCase();

                    if (filter === 'censor') {
                        this.update(('' + value).replace(/./g, 'X'));
                    }
                    else if (filter === 'remove') {
                        this.delete();
                    }
                    // Means this is a string that needs to be turned into a RegEx
                    else {
                        var regex = new RegExp(filter);
                        this.update(('' + value).replace(regex, replacer));
                    }
                }
            }
        });
    };

    this.event = 'response';
    this.timestamp = request.info.received;
    this.id = request.id;
    this.instance = request.connection.info.uri;
    this.labels = request.connection.settings.labels;
    this.method = request.method;
    this.path = request.path;
    this.query = request.query;
    this.responseTime = Date.now() - request.info.received;
    this.statusCode = res.statusCode;
    this.pid = process.pid;
    this.source = {
        remoteAddress: request.info.remoteAddress,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer
    };

    this.log = request.getLog();

    if (options.requestHeaders) {
        this.headers = req.headers;
    }

    if (options.requestPayload) {
        this.requestPayload = request.payload;
    }

    if (options.responsePayload && request.response) {
        this.responsePayload = request.response.source;
    }

    if (Object.keys(filterRules).length) {

        applyFilter(this.requestPayload);
        applyFilter(this.responsePayload);
    }

    Object.freeze(this);
};


// Payload for "ops" events
exports.GreatOps = function (ops) {

    if (this.constructor !== exports.GreatOps) {
        return new exports.GreatOps(ops);
    }

    this.event = 'ops';
    this.timestamp = Date.now();
    this.host = ops.host;
    this.pid = process.pid;
    this.os = {
        load: ops.osload,
        mem: ops.osmem,
        uptime: ops.osup
    };
    this.proc = {
        uptime: ops.psup,
        mem: ops.psmem,
        delay: ops.psdelay
    };
    this.load = {
        requests: ops.requests,
        concurrents: ops.concurrents,
        responseTimes: ops.responseTimes,
        sockets: ops.sockets
    };

    Object.freeze(this);
};


// Payload for "request" events via request.log
exports.GreatRequest = function (request, event) {

    if (this.constructor !== exports.GreatRequest) {
        return new exports.GreatRequest(request, event);
    }

    this.event = 'request';
    this.timestamp = event.timestamp;
    this.tags = event.tags;
    this.data = event.data;
    this.pid = process.pid;
    this.id = request.id;
    this.method = request.method;
    this.path = request.path;

    Object.freeze(this);
};


// Payload for "wreck" events
exports.GreatWreck = function (error, request, response, start, uri) {

    if (this.constructor !== exports.GreatWreck) {
        return new exports.GreatWreck(error, request, response, start, uri);
    }

    request = request || {};
    response = response || {};
    uri = uri || {};
    this.event = 'wreck';
    this.timestamp = Date.now();
    this.timeSpent = this.timestamp - start;
    this.pid = process.pid;

    if (error) {
        this.error = {
            message: error.message,
            stack: error.stack
        };
    }

    this.request = {
        method: uri.method,
        path: uri.path,
        url: uri.href,
        protocol: uri.protocol,
        host: uri.host,
        headers: request._headers
    };

    this.response = {
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers
    };

    Object.freeze(this);
};
