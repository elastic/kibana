var Writable = require('stream').Writable,
    util = require('util');

function Gatherer(opts) {
  opts.decodeStrings = true;
  Writable.call(this, opts);
  this._length = 0;
  this._chunks = [];
  this._maxLength = ('maxLength' in opts) ? opts.maxLength : Infinity;
}

util.inherits(Gatherer, Writable);

Gatherer.prototype._write = function (d, _enc, cb) {
  if (this._length + d.length > this._maxLength) {
    return cb(new Error("Maximum length exceeded!"));
  }
  this._chunks.push(d);
  this._length += d.length;
  cb(); 
}

Gatherer.prototype.getBuffer = function () {
  return Buffer.concat(this._chunks, this._length);
}

module.exports = function (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  var target = new Gatherer(opts);
  target.on('error', cb);
  target.on('pipe', function (source) {
    source.on('error', cb);
  });
  target.on('unpipe', function (source) {
    source.removeListener('error', cb);
  });
  target.on('finish', function () {
    cb(null, target.getBuffer());
  });
  return target;
}
