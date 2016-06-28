// Load modules

var Hoek = require('hoek');


// Declare internals

var internals = {};


exports = module.exports = internals.Vise = function (chunks) {

    this.length = 0;
    this._chunks = [];
    this._offset = 0;

    if (chunks) {
        chunks = [].concat(chunks);
        for (var i = 0, il = chunks.length; i < il; ++i) {
            this.push(chunks[i]);
        }
    }
};


internals.Vise.prototype.push = function (chunk) {

    Hoek.assert(Buffer.isBuffer(chunk), 'Chunk must be a buffer');

    var item = {
        data: chunk,
        length: chunk.length,
        offset: this.length + this._offset,
        index: this._chunks.length
    };

    this._chunks.push(item);
    this.length += chunk.length;
};


internals.Vise.prototype.shift = function (length) {

    if (!length) {
        return [];
    }

    var prevOffset = this._offset;
    var item = this._chunkAt(length);

    var dropTo = this._chunks.length;
    this._offset = 0;

    if (item) {
        dropTo = item.chunk.index;
        this._offset = item.offset;
    }

    // Drop lower chunks

    var chunks = [];
    for (var i = 0; i < dropTo; ++i) {
        var chunk = this._chunks.shift();
        if (i === 0 &&
            prevOffset) {

            chunks.push(chunk.data.slice(prevOffset));
        }
        else {
            chunks.push(chunk.data);
        }
    }

    if (this._offset) {
        chunks.push(item.chunk.data.slice(dropTo ? 0 : prevOffset, this._offset));
    }

    // Recalculate existing chunks

    this.length = 0;
    for (var j = 0, jl = this._chunks.length; j < jl; ++j) {
        var chunk = this._chunks[j];
        chunk.offset = this.length,
        chunk.index = j;

        this.length += chunk.length;
    }

    this.length -= this._offset;

    return chunks;
};


internals.Vise.prototype.at = internals.Vise.prototype.readUInt8 = function (pos) {

    var item = this._chunkAt(pos);
    return item ? item.chunk.data[item.offset] : undefined;
};


internals.Vise.prototype._chunkAt = function (pos) {

    if (pos < 0) {
        return null;
    }

    pos = pos + this._offset;

    for (var i = 0, il = this._chunks.length; i < il; ++i) {
        var chunk = this._chunks[i];
        var offset = pos - chunk.offset;
        if (offset < chunk.length) {
            return { chunk: chunk, offset: offset };
        }
    }

    return null;
};


internals.Vise.prototype.chunks = function () {

    var chunks = [];

    for (var i = 0, il = this._chunks.length; i < il; ++i) {
        var chunk = this._chunks[i];
        if (i === 0 &&
            this._offset) {

            chunks.push(chunk.data.slice(this._offset));
        }
        else {
            chunks.push(chunk.data);
        }
    }

    return chunks;
};


internals.Vise.prototype.startsWith = function (value, pos, length) {

    pos = pos || 0;

    length = length ? Math.min(value.length, length) : value.length;
    if (pos + length > this.length) {                                   // Not enough length to fit value
        return false;
    }

    var start = this._chunkAt(pos);
    if (!start) {
        return false;
    }

    for (var k = start.chunk.index, kl = this._chunks.length, j = 0; k < kl && j < length; ++k) {
        var chunk = this._chunks[k];

        var offset = (k === start.chunk.index ? start.offset : 0);
        for (var i = offset, il = chunk.length; i < il && j < length; ++i, ++j) {
            if (chunk.data[i] !== value[j]) {
                return false;
            }
        }
    }

    return true;
};