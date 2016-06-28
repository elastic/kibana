// Load modules

var Http = require('http');
var Stream = require('stream');
var Util = require('util');
var Url = require('url');
var Hoek = require('hoek');


// Declare internals

var internals = {};


internals.Request = function (options) {

    var self = this;

    Stream.Readable.call(this);

    // options: method, url, payload, headers

    var url = options.url;

    if (typeof url === 'object') {
        url = Url.format(url);
    }

    var uri = Url.parse(url);
    this.url = uri.path;

    this.httpVersion = '1.1';
    this.method = options.method.toUpperCase();

    this.headers = {};
    var headers = options.headers || {};
    var fields = Object.keys(headers);
    fields.forEach(function (field) {

        self.headers[field.toLowerCase()] = headers[field];
    });

    this.headers['user-agent'] = this.headers['user-agent'] || 'shot';

    if (uri.host &&
        !this.headers.host) {

        this.headers.host = uri.host;
    }

    // Use _shot namespace to avoid collision with Node

    var payload = options.payload || null;
    if (payload &&
        typeof payload !== 'string' &&
        !Buffer.isBuffer(payload)) {

        payload = JSON.stringify(payload);
        this.headers['content-type'] = this.headers['content-type'] || 'application/json';
    }

    // Set the content-length for the corresponding payload if none set

    if (payload &&
        !this.headers.hasOwnProperty('content-length')) {

        this.headers['content-length'] = (Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(payload)).toString();
    }

    this._shot = {
        payload: payload,
        isDone: false,
        simulate: options.simulate || {}
    };

    return this;
};

Util.inherits(internals.Request, Stream.Readable);


internals.Request.prototype._read = function (size) {

    var self = this;

    setImmediate(function () {

        if (self._shot.isDone) {
            if (self._shot.simulate.end !== false) {        // 'end' defaults to true
                self.push(null);
            }

            return;
        }

        self._shot.isDone = true;

        if (self._shot.payload) {
            if (self._shot.simulate.split) {
                self.push(self._shot.payload.slice(0, 1));
                self.push(self._shot.payload.slice(1));
            }
            else {
                self.push(self._shot.payload);
            }
        }

        if (self._shot.simulate.error) {
            self.emit('error', new Error('Simulated'));
        }

        if (self._shot.simulate.close) {
            self.emit('close');
        }

        if (self._shot.simulate.end !== false) {        // 'end' defaults to true
            self.push(null);
        }
    });
};


internals.Request.prototype.destroy = function () {

};


internals.Response = function (req, onEnd) {

    Http.ServerResponse.call(this, { method: req.method, httpVersionMajor: 1, httpVersionMinor: 1 });

    this.once('finish', internals.finish(this, req, onEnd));

    return this;
};

Util.inherits(internals.Response, Http.ServerResponse);


internals.Response.prototype.writeHead = function () {

    var self = this;

    var headers = ((arguments.length === 2 && typeof arguments[1] === 'object') ? arguments[1] : (arguments.length === 3 ? arguments[2] : {}));
    var result = Http.ServerResponse.prototype.writeHead.apply(this, arguments);

    this._headers = this._headers || {};
    var keys = Object.keys(headers);
    for (var i = 0, il = keys.length; i < il; ++i) {
        this._headers[keys[i]] = headers[keys[i]];
    }

    // Add raw headers

    ['Date', 'Connection', 'Transfer-Encoding'].forEach(function (name) {

        var regex = new RegExp('\\r\\n' + name + ': ([^\\r]*)\\r\\n');
        var field = self._header.match(regex);
        if (field) {
            self._headers[name.toLowerCase()] = field[1];
        }
    });

    return result;
};


internals.Response.prototype.write = function (data, encoding) {

    Http.ServerResponse.prototype.write.call(this, data, encoding);
    return true;                                                    // Write always returns false when disconnected
};


internals.Response.prototype.end = function (data, encoding) {

    Http.ServerResponse.prototype.end.call(this, data, encoding);
    this.emit('finish');                                            // Will not be emitted when disconnected
};


internals.Response.prototype.destroy = function () {

};


internals.finish = function (response, req, onEnd) {

    return function () {

        // Prepare response object

        var res = {
            raw: {
                req: req,
                res: response
            },
            headers: response._headers,
            statusCode: response.statusCode
        };

        // When done, call callback

        process.nextTick(function () {

            onEnd(res);
        });

        // Read payload

        var raw = [];
        var rawLength = 0;
        for (var i = 0, il = response.output.length; i < il; ++i) {
            var chunk = (response.output[i] instanceof Buffer ? response.output[i] : new Buffer(response.output[i], response.outputEncodings[i]));
            raw.push(chunk);
            rawLength += chunk.length;
        }

        var rawBuffer = Buffer.concat(raw, rawLength);

        // Parse payload
        res.payload = '';

        var CRLF = '\r\n';
        var sep = new Buffer(CRLF + CRLF);
        var parts = internals.splitBufferInTwo(rawBuffer, sep);
        var payloadBuffer = parts[1];

        if (!res.headers['transfer-encoding']) {
            res.rawPayload = payloadBuffer;
            res.payload = payloadBuffer.toString();
            return;
        }

        var CRLFBuffer = new Buffer(CRLF);
        var rest = payloadBuffer;
        var payloadBytes = [];
        do {
            var payloadParts = internals.splitBufferInTwo(rest, CRLFBuffer);
            var next = payloadParts[1];
            var size = parseInt(payloadParts[0].toString(), 16);
            if (size === 0) {
                rest = next;
            }
            else {
                var nextData = next.slice(0, size);
                payloadBytes = payloadBytes.concat(Array.prototype.slice.call(nextData, 0));
                rest = next.slice(size + 2);
            }
        }
        while (size);

        res.rawPayload = new Buffer(payloadBytes);
        res.payload = res.rawPayload.toString('utf8');
        var headers = rest.toString().split(CRLF);
        headers.forEach(function (header) {

            var parts = header.split(':');
            if (parts.length === 2) {
                response._headers[parts[0].trim().toLowerCase()] = parts[1].trim();
            }
        });
    };
};


internals.splitBufferInTwo = function (buffer, seperator) {

    for (var i = 0, max = buffer.length - seperator.length; i < max; ++i) {
        if (internals.bufferEqual(buffer.slice(i, i + seperator.length), seperator)) {
            var part1 = buffer.slice(0, i);
            var part2 = buffer.slice(i + seperator.length);
            return [part1, part2];
        }
    }

    return [buffer, new Buffer(0)];
};


exports.inject = function (dispatchFunc, options, callback) {

    options = (typeof options === 'string' ? { url: options } : options);
    var settings = Hoek.applyToDefaults({ method: 'GET' }, options);

    var req = new internals.Request(settings);
    var res = new internals.Response(req, callback);
    dispatchFunc(req, res);
};


exports.isInjection = function (obj) {

    return (obj instanceof internals.Request || obj instanceof internals.Response);
};


internals.bufferEqual = function (a, b) {

    for (var i = 0, il = a.length; i < il; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
};
