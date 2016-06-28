// Load modules

var Stream = require('stream');
var B64 = require('b64');
var Boom = require('boom');
var Content = require('content');
var Hoek = require('hoek');
var Nigel = require('nigel');


// Declare internals

var internals = {};


/*
    RFC 2046 (http://tools.ietf.org/html/rfc2046)

    multipart-body = [preamble CRLF]
                    dash-boundary *( SPACE / HTAB ) CRLF body-part
                    *( CRLF dash-boundary *( SPACE / HTAB ) CRLF body-part )
                    CRLF dash-boundary "--" *( SPACE / HTAB )
                    [CRLF epilogue]

    boundary       = 0*69<bchars> bcharsnospace
    bchars         = bcharsnospace / " "
    bcharsnospace  = DIGIT / ALPHA / "'" / "(" / ")" / "+" / "_" / "," / "-" / "." / "/" / ":" / "=" / "?"
    dash-boundary  = "--" boundary

    preamble       = discard-text
    epilogue       = discard-text
    discard-text   = *(*text CRLF) *text

    body-part      = MIME-part-headers [CRLF *OCTET]
    OCTET          = <any 0-255 octet value>

    SPACE          = 32
    HTAB           = 9
    CRLF           = 13 10
*/


internals.state = {
    preamble: 0,                // Until the first boundary is received
    boundary: 1,                // After a boundary, waiting for first line with optional linear-whitespace
    header: 2,                  // Receiving part headers
    payload: 3,                 // Receiving part payload
    epilogue: 4
};


exports.Dispenser = internals.Dispenser = function (contentType) {

    var self = this;

    Stream.Writable.call(this);

    this._boundary = contentType.boundary;
    this._state = internals.state.preamble;
    this._held = '';

    this._stream = null;
    this._headers = {};
    this._name = '';
    this._pendingHeader = '';
    this._error = null;

    this._parts = new Nigel.Stream(new Buffer('--' + contentType.boundary));
    this._lines = new Nigel.Stream(new Buffer('\r\n'));

    this._parts.on('needle', function () {

        self._onPartEnd();
    });

    this._parts.on('haystack', function (chunk) {

        self._onPart(chunk);
    });

    this._lines.on('needle', function () {

        self._onLineEnd();
    });

    this._lines.on('haystack', function (chunk) {

        self._onLine(chunk);
    });

    this.once('finish', function () {

        self._parts.end();
    });

    this._parts.once('close', function () {

        self._lines.end();
    });

    var piper = null;
    var finish = function (err) {

        if (piper) {
            piper.removeListener('error', finish);
            piper.removeListener('aborted', onReqAborted);
        }

        if (err) {
            return self._abort(err);
        }

        self._emit('close');
    };

    finish = Hoek.once(finish);

    this._lines.once('close', function () {

        if (self._state === internals.state.epilogue) {
            if (self._held) {
                self._emit('epilogue', self._held);
                self._held = '';
            }
        }
        else if (self._state === internals.state.boundary) {
            if (!self._held) {
                self._abort(Boom.badRequest('Missing end boundary'));
            }
            else if (self._held !== '--') {
                self._abort(Boom.badRequest('Only white space allowed after boundary at end'));
            }
        }
        else {
            self._abort(Boom.badRequest('Incomplete multipart payload'));
        }

        setImmediate(finish);                  // Give pending events a chance to fire
    });

    var onReqAborted = function () {

        finish(Boom.badRequest('Client request aborted'));
    };

    this.once('pipe', function (req) {

        piper = req;
        req.once('error', finish);
        req.once('aborted', onReqAborted);
    });
};

Hoek.inherits(internals.Dispenser, Stream.Writable);


internals.Dispenser.prototype._write = function (buffer, encoding, next) {

    if (this._error) {
        return next();
    }

    this._parts.write(buffer);
    return next();
};


internals.Dispenser.prototype._emit = function () {

    if (this._error) {
        return;
    }

    this.emit.apply(this, arguments);
};


internals.Dispenser.prototype._abort = function (err) {

    this._emit('error', err);
    this._error = err;
};


internals.Dispenser.prototype._onPartEnd = function () {

    this._lines.flush();

    if (this._state === internals.state.preamble) {
        if (this._held) {
            var last = this._held.length - 1;
            if (this._held[last] !== '\n' ||
                this._held[last - 1] !== '\r') {

                return this._abort(Boom.badRequest('Preamble missing CRLF terminator'));
            }

            this._emit('preamble', this._held.slice(0, -2));
            this._held = '';
        }

        this._parts.needle(new Buffer('\r\n--' + this._boundary));                      // CRLF no longer optional
    }

    this._state = internals.state.boundary;

    if (this._stream) {
        this._stream.end();
        this._stream = null;
    }
    else if (this._name) {
        this._emit('field', this._name, this._held);
        this._name = '';
        this._held = '';
    }
};


internals.Dispenser.prototype._onPart = function (chunk) {

    if (this._state === internals.state.preamble) {
        this._held += chunk.toString();
    }
    else if (this._state === internals.state.payload) {
        if (this._stream) {
            this._stream.write(chunk);                                                 // Stream payload
        }
        else {
            this._held += chunk.toString();
        }
    }
    else {
        this._lines.write(chunk);                                                       // Look for boundary
    }
};


internals.Dispenser.prototype._onLineEnd = function () {

    // Boundary whitespace

    if (this._state === internals.state.boundary) {
        if (this._held) {
            this._held = this._held.replace(/[\t ]/g, '');                                // trim() removes new lines
            if (this._held) {
                if (this._held === '--') {
                    this._state = internals.state.epilogue;
                    this._held = '';

                    return;
                }
                else {
                    return this._abort(Boom.badRequest('Only white space allowed after boundary'));
                }
            }
        }

        this._state = internals.state.header;

        return;
    }

    // Part headers

    if (this._state === internals.state.header) {

        // Header

        if (this._held) {

            // Header continuation

            if (this._held[0] === ' ' ||
                this._held[0] === '\t') {

                if (!this._pendingHeader) {
                    return this._abort(Boom.badRequest('Invalid header continuation without valid declaration on previous line'));
                }

                this._pendingHeader += ' ' + this._held.slice(1);                       // Drop tab
                this._held = '';
                return;
            }

            // Start of new header

            this._flushHeader();
            this._pendingHeader = this._held;
            this._held = '';

            return;
        }

        // End of headers

        this._flushHeader();

        this._state = internals.state.payload;

        var disposition = Content.disposition(this._headers['content-disposition']);
        if (disposition.isBoom) {
            return this._abort(disposition);
        }

        if (disposition.filename !== undefined) {
            var stream = new Stream.PassThrough();
            var transferEncoding = this._headers['content-transfer-encoding'];
            if (transferEncoding &&
                transferEncoding.toLowerCase() === 'base64') {

                this._stream = new B64.Decoder();
                this._stream.pipe(stream);
            }
            else {
                this._stream = stream;
            }

            stream.name = disposition.name;
            stream.filename = disposition.filename;
            stream.headers = this._headers;
            this._headers = {};


            this._emit('part', stream);
        }
        else {
            this._name = disposition.name;
        }

        this._lines.flush();
        return;
    }

    // Epilogue

    this._held += '\r\n';                               // Put the new line back
};


internals.Dispenser.prototype._onLine = function (chunk) {

    if (this._stream) {
        this._stream.write(chunk);                      // Stream payload
    }
    else {
        this._held += chunk.toString();                 // Reading header or field
    }
};


internals.Dispenser.prototype._flushHeader = function () {

    if (!this._pendingHeader) {
        return;
    }

    var sep = this._pendingHeader.indexOf(':');
    if (sep === -1) {
        return this._abort(Boom.badRequest('Invalid header missing colon separator'));
    }

    if (!sep) {
        return this._abort(Boom.badRequest('Invalid header missing field name'));
    }

    this._headers[this._pendingHeader.slice(0, sep).toLowerCase()] = this._pendingHeader.slice(sep + 1).trim();
    this._pendingHeader = '';
};
