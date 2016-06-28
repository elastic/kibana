// Load modules

var Events = require('events');
var Stream = require('stream');
var Hoek = require('hoek');
var Vise = require('vise');


// Declare internals

var internals = {};


exports.compile = function (needle) {

    Hoek.assert(needle && needle.length, 'Missing needle');
    Hoek.assert(Buffer.isBuffer(needle), 'Needle must be a buffer');

    var profile = {
        value: needle,
        lastPos: needle.length - 1,
        last: needle[needle.length - 1],
        length: needle.length,
        badCharShift: new Buffer(256)                  // Lookup table of how many characters can be skipped for each match
    };

    for (var i = 0; i < 256; ++i) {
        profile.badCharShift[i] = profile.length;       // Defaults to the full length of the needle
    }

    var last = profile.length - 1;
    for (i = 0; i < last; ++i) {                        // For each character in the needle (skip last since its position is already the default)
        profile.badCharShift[profile.value[i]] = last - i;
    }

    return profile;
};


exports.horspool = function (haystack, needle, start) {

    Hoek.assert(haystack, 'Missing haystack');

    needle = (needle.badCharShift ? needle : exports.compile(needle));
    start = start || 0;

    for (var i = start, il = haystack.length - needle.length; i <= il;) {       // Has enough room to fit the entire needle
        var lastChar = haystack.readUInt8(i + needle.lastPos, true);
        if (lastChar === needle.last &&
            internals.startsWith(haystack, needle, i)) {

            return i;
        }

        i += needle.badCharShift[lastChar];           // Jump to the next possible position based on last character location in needle
    }

    return -1;
};


internals.startsWith = function (haystack, needle, pos) {

    if (haystack.startsWith) {
        return haystack.startsWith(needle.value, pos, needle.lastPos);
    }

    for (var i = 0, il = needle.lastPos; i < il; ++i) {
        if (needle.value[i] !== haystack.readUInt8(pos + i, true)) {
            return false;
        }
    }

    return true;
};


exports.all = function (haystack, needle, start) {

    needle = exports.compile(needle);
    start = start || 0;

    var matches = [];
    for (var last = start, hlen = haystack.length; last !== -1 && last < hlen;) {

        last = exports.horspool(haystack, needle, last)
        if (last !== -1) {
            matches.push(last);
            last += needle.length;
        }
    }

    return matches;
};


internals._indexOf = function (haystack, needle) {

    Hoek.assert(haystack, 'Missing haystack');

    for (var i = 0, il = haystack.length - needle.length; i <= il; ++i) {       // Has enough room to fit the entire needle
        if (haystack.startsWith(needle.value, i)) {
            return i;
        }
    }

    return -1;
};


exports.Stream = internals.Stream = function (needle) {

    var self = this;

    Stream.Writable.call(this);

    this.needle(needle);
    this._haystack = new Vise();
    this._indexOf = this._needle.length > 2 ? exports.horspool : internals._indexOf;

    this.on('finish', function () {

        // Flush out the remainder

        var chunks = self._haystack.chunks();
        for (var i = 0, il = chunks.length; i < il; ++i) {
            self.emit('haystack', chunks[i]);
        }

        setImmediate(function () {                  // Give pending events a chance to fire

            self.emit('close');
        });
    });
};

Hoek.inherits(internals.Stream, Stream.Writable);


internals.Stream.prototype.needle = function (needle) {

    this._needle = exports.compile(needle);
};


internals.Stream.prototype._write = function (chunk, encoding, next) {

    this._haystack.push(chunk);

    var match = this._indexOf(this._haystack, this._needle);
    if (match === -1 &&
        chunk.length >= this._needle.length) {

        this._flush(this._haystack.length - chunk.length);
    }

    while (match !== -1) {
        this._flush(match);
        this._haystack.shift(this._needle.length);
        this.emit('needle');

        match = this._indexOf(this._haystack, this._needle);
    }

    if (this._haystack.length) {
        var notChecked = this._haystack.length - this._needle.length + 1;       // Not enough space for Horspool
        for (var i = notChecked; i < this._haystack.length; ++i) {
            if (this._haystack.startsWith(this._needle.value, i, this._haystack.length - i)) {
                break;
            }
        }

        this._flush(i);
    }

    return next();
};


internals.Stream.prototype._flush = function (pos) {

    var chunks = this._haystack.shift(pos);
    for (var i = 0, il = chunks.length; i < il; ++i) {
        this.emit('haystack', chunks[i]);
    }
};


internals.Stream.prototype.flush = function () {

    var chunks = this._haystack.shift(this._haystack.length);
    for (var i = 0, il = chunks.length; i < il; ++i) {
        this.emit('haystack', chunks[i]);
    }
};
