// Load modules

var Stream = require('stream');
var Hoek = require('hoek');


// Declare internals

var internals = {};


exports.header = function (header, length) {

    // Parse header

    var parts = header.split('=');
    if (parts.length !== 2 ||
        parts[0] !== 'bytes') {

        return null;
    }

    var lastPos = length - 1;

    var result = [];
    var ranges = parts[1].match(/\d*\-\d*/g);
    for (var i = 0, il = ranges.length; i < il; ++i) {
        var range = ranges[i];
        if (range.length === 1) {               // '-'
            return null;
        }

        var set = {};
        range = range.split('-');
        if (range[0]) {
            set.from = parseInt(range[0], 10);
        }

        if (range[1]) {
            set.to = parseInt(range[1], 10);
            if (set.from !== undefined) {      // Can be 0
                // From-To
                if (set.to > lastPos) {
                    set.to = lastPos;
                }
            }
            else {
                // -To
                set.from = length - set.to;
                set.to = lastPos;
            }
        }
        else {
            // From-
            set.to = lastPos;
        }

        if (set.from > set.to) {
            return null;
        }

        result.push(set);
    }

    if (result.length === 1) {
        return result;
    }

    // Sort and consolidate ranges

    result.sort(function (a, b) {

        return a.from - b.from;
    });

    var consolidated = [];
    for (i = result.length - 1; i > 0; --i) {
        var current = result[i];
        var before = result[i - 1];
        if (current.from <= before.to + 1) {
            before.to = current.to;
        }
        else {
            consolidated.unshift(current);
        }
    }

    consolidated.unshift(result[0]);

    return consolidated;
};


exports.Stream = internals.Stream = function (range) {

    Stream.Transform.call(this);

    this._range = range;
    this._next = 0;
};

Hoek.inherits(internals.Stream, Stream.Transform);


internals.Stream.prototype._transform = function (chunk, encoding, done) {

    var pos = this._next;
    this._next += chunk.length;

    if (this._next <= this._range.from ||       // Before range
        pos > this._range.to) {                 // After range

        return done();
    }

    var from = Math.max(0, this._range.from - pos);
    var to = Math.min(chunk.length, this._range.to - pos + 1);

    this.push(chunk.slice(from, to));
    return done();
};
