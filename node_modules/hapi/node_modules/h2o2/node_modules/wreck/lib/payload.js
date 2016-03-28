
// Load modules

var Hoek = require('hoek');
var Stream = require('stream');


// Declare internals

var internals = {};


module.exports = internals.Payload = function (payload, encoding) {

    Stream.Readable.call(this);

    var data = [].concat(payload || '');
    var size = 0;
    for (var i = 0, il = data.length; i < il; ++i) {
        var chunk = data[i];
        size += chunk.length;
        data[i] = Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk);
    }

    this._data = Buffer.concat(data, size);
    this._position = 0;
    this._encoding = encoding || 'utf8';
};

Hoek.inherits(internals.Payload, Stream.Readable);


internals.Payload.prototype._read = function (size) {

    var chunk = this._data.slice(this._position, this._position + size);
    this.push(chunk, this._encoding);
    this._position += chunk.length;

    if (this._position >= this._data.length) {
        this.push(null);
    }
};
