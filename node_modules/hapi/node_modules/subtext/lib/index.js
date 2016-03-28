// Load modules

var Crypto = require('crypto');
var Fs = require('fs');
var Os = require('os');
var Path = require('path');
var Stream = require('stream');
var Zlib = require('zlib');
var Boom = require('boom');
var Content = require('content');
var Hoek = require('hoek');
var Pez = require('pez');
var Qs = require('qs');
var Wreck = require('wreck');


// Declare internals

var internals = {};


exports.parse = function (req, tap, options, next) {

    Hoek.assert(options, 'Missing options');
    Hoek.assert(options.parse !== undefined, 'Missing parse option setting');
    Hoek.assert(options.output !== undefined, 'Missing output option setting');

    var parser = new internals.Parser(req, tap, options, next);
    return parser.read();
};


internals.Parser = function (req, tap, options, next) {

    var self = this;

    this.req = req;
    this.settings = options;
    this.tap = tap;

    this.result = {};

    this.next = function (err) {

        return next(err, self.result);
    };
};


internals.Parser.prototype.read = function () {

    var next = this.next;

    // Content size

    var req = this.req;
    var contentLength = req.headers['content-length'];
    if (this.settings.maxBytes !== undefined &&
        contentLength &&
        parseInt(contentLength, 10) > this.settings.maxBytes) {

        return next(Boom.badRequest('Payload content length greater than maximum allowed: ' + this.settings.maxBytes));
    }

    // Content type

    var contentType = Content.type(this.settings.override || req.headers['content-type'] || 'application/json');     //  Defaults to 'application/json'
    if (contentType.isBoom) {
        return next(contentType);
    }

    this.result.contentType = contentType;
    this.result.mime = contentType.mime;

    if (this.settings.allow &&
        this.settings.allow.indexOf(contentType.mime) === -1) {

        return next(Boom.unsupportedMediaType());
    }

    // Parse: true

    if (this.settings.parse === true) {
        return this.parse(contentType);
    }

    // Parse: false, 'gunzip'

    return this.raw();
};


internals.Parser.prototype.parse = function (contentType) {

    var self = this;

    var next = this.next;

    var output = this.settings.output;      // Output: 'data', 'stream', 'file'
    var source = this.req;

    // Content-encoding

    var contentEncoding = source.headers['content-encoding'];
    if (contentEncoding === 'gzip' || contentEncoding === 'deflate') {
        var decoder = (contentEncoding === 'gzip' ? Zlib.createGunzip() : Zlib.createInflate());
        next = Hoek.once(next);                                                                     // Modify next() for async events
        this.next = next;
        decoder.once('error', function (err) {

            return next(Boom.badRequest('Invalid compressed payload', err));
        });

        source = source.pipe(decoder);
    }

    // Tap request

    if (this.tap) {
        source = source.pipe(this.tap);
    }

    // Multipart

    if (this.result.contentType.mime === 'multipart/form-data') {
        return this.multipart(source, contentType);
    }

    // Output: 'stream'

    if (output === 'stream') {
        this.result.payload = source;
        return next();
    }

    // Output: 'file'

    if (output === 'file') {
        this.writeFile(source, function (err, path, bytes) {

            if (err) {
                return next(err);
            }

            self.result.payload = { path: path, bytes: bytes };
            return next();
        });

        return;
    }

    // Output: 'data'

    return Wreck.read(source, { timeout: this.settings.timeout, maxBytes: this.settings.maxBytes }, function (err, payload) {

        if (err) {
            return next(err);
        }

        self.result.payload = {};

        if (!payload.length) {
            return next();
        }

        internals.object(payload, self.result.contentType.mime, self.settings, function (err, result) {

            if (err) {
                return next(err);
            }

            self.result.payload = result;
            return next();
        });
    });
};


internals.Parser.prototype.raw = function () {

    var self = this;

    var next = this.next;

    var output = this.settings.output;      // Output: 'data', 'stream', 'file'
    var source = this.req;

    // Content-encoding

    if (this.settings.parse === 'gunzip') {
        var contentEncoding = source.headers['content-encoding'];
        if (contentEncoding === 'gzip' || contentEncoding === 'deflate') {
            var decoder = (contentEncoding === 'gzip' ? Zlib.createGunzip() : Zlib.createInflate());
            next = Hoek.once(next);                                                                     // Modify next() for async events

            decoder.once('error', function (err) {

                return next(Boom.badRequest('Invalid compressed payload', err));
            });

            source = source.pipe(decoder);
        }
    }

    // Setup source

    if (this.tap) {
        source = source.pipe(this.tap);
    }

    // Output: 'stream'

    if (output === 'stream') {
        this.result.payload = source;
        return next();
    }

    // Output: 'file'

    if (output === 'file') {
        this.writeFile(source, function (err, path, bytes) {

            if (err) {
                return next(err);
            }

            self.result.payload = { path: path, bytes: bytes };
            return next();
        });

        return;
    }

    // Output: 'data'

    return Wreck.read(source, { timeout: this.settings.timeout, maxBytes: this.settings.maxBytes }, function (err, payload) {

        if (err) {
            return next(err);
        }

        self.result.payload = payload;
        return next();
    });
};


internals.object = function (payload, mime, options, next) {

    // Binary

    if (mime === 'application/octet-stream') {
        return next(null, payload);
    }

    // Text

    if (mime.match(/^text\/.+$/)) {
        return next(null, payload.toString('utf8'));
    }

    // JSON

    if (/^application\/(?:.+\+)?json$/.test(mime)) {
        return internals.jsonParse(payload, next);                      // Isolate try...catch for V8 optimization
    }

    // Form-encoded

    if (mime === 'application/x-www-form-urlencoded') {
        return next(null, Qs.parse(payload.toString('utf8'), options.qs));
    }

    return next(Boom.unsupportedMediaType());
};


internals.jsonParse = function (payload, next) {

    try {
        var parsed = JSON.parse(payload.toString('utf8'));
    }
    catch (err) {
        return next(Boom.badRequest('Invalid request payload JSON format', err));
    }

    return next(null, parsed);
};


internals.Parser.prototype.multipart = function (source, contentType) {

    var self = this;

    var next = this.next;
    next = Hoek.once(next);                                            // Modify next() for async events
    this.next = next;

    var dispenser = new Pez.Dispenser(contentType);

    var onError = function (err) {

        return next(Boom.badRequest('Invalid multipart payload format', err));
    };

    dispenser.once('error', onError);

    var arrayFields = false;
    var data = {};
    var finalize = function () {

        dispenser.removeListener('error', onError);
        dispenser.removeListener('part', onPart);
        dispenser.removeListener('field', onField);
        dispenser.removeListener('close', onClose);

        if (arrayFields) {
            data = Qs.parse(data, self.settings.qs);
        }

        self.result.payload = data;
        return next();
    };

    var set = function (name, value) {

        arrayFields = arrayFields || (name.indexOf('[') !== -1);

        if (!data.hasOwnProperty(name)) {
            data[name] = value;
        }
        else if (Array.isArray(data[name])) {
            data[name].push(value);
        }
        else {
            data[name] = [data[name], value];
        }
    };

    var pendingFiles = {};
    var nextId = 0;
    var closed = false;

    var onPart = function (part) {

        if (self.settings.output === 'file') {                                                  // Output: 'file'
            var id = nextId++;
            pendingFiles[id] = true;
            self.writeFile(part, function (err, path, bytes) {

                delete pendingFiles[id];

                if (err) {
                    return next(err);
                }

                var item = {
                    filename: part.filename,
                    path: path,
                    headers: part.headers,
                    bytes: bytes
                };

                set(part.name, item);

                if (closed &&
                    !Object.keys(pendingFiles).length) {

                    return finalize(data);
                }
            });
        }
        else {                                                                                  // Output: 'data'
            Wreck.read(part, {}, function (err, payload) {

                // err handled by dispenser.once('error')

                if (self.settings.output === 'stream') {                                        // Output: 'stream'
                    var item = Wreck.toReadableStream(payload);

                    item.hapi = {
                        filename: part.filename,
                        headers: part.headers
                    };

                    return set(part.name, item);
                }

                var ct = part.headers['content-type'] || '';
                var mime = ct.split(';')[0].trim().toLowerCase();

                if (!mime) {
                    return set(part.name, payload);
                }

                if (!payload.length) {
                    return set(part.name, {});
                }

                internals.object(payload, mime, self.settings, function (err, result) {

                    return set(part.name, err ? payload : result);
                });
            });
        }
    };

    dispenser.on('part', onPart);

    var onField = function (name, value) {

        set(name, value);
    };

    dispenser.on('field', onField);

    var onClose = function () {

        if (Object.keys(pendingFiles).length) {
            closed = true;
            return;
        }

        return finalize(data);
    };

    dispenser.once('close', onClose);

    source.pipe(dispenser);
};


internals.Parser.prototype.writeFile = function (stream, callback) {

    var self = this;

    var path = Hoek.uniqueFilename(this.settings.uploads || Os.tmpDir());
    var file = Fs.createWriteStream(path, { flags: 'wx' });
    var counter = new internals.Counter();

    var finalize = Hoek.once(function (err) {

        self.req.removeListener('aborted', onAbort);
        file.removeListener('close', finalize);
        file.removeListener('error', finalize);

        if (!err) {
            return callback(null, path, counter.bytes);
        }

        file.destroy();
        Fs.unlink(path, function (/* fsErr */) {      // Ignore unlink errors

            return callback(err);
        });
    });

    file.once('close', finalize);
    file.once('error', finalize);

    var onAbort = function () {

        return finalize(Boom.badRequest('Client connection aborted'));
    };

    this.req.once('aborted', onAbort);

    stream.pipe(counter).pipe(file);
};


internals.Counter = function () {

    Stream.Transform.call(this);
    this.bytes = 0;
};

Hoek.inherits(internals.Counter, Stream.Transform);


internals.Counter.prototype._transform = function (chunk, encoding, next) {

    this.bytes += chunk.length;
    return next(null, chunk);
};
