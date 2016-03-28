var Stream = require('stream');
var Hoek = require('hoek');
var Stringify = require('json-stringify-safe');

var internals = {
    defaults: {
        separator: ''
    }
};

internals.SafeJson = module.exports = function (options, transformOptions) {

    if (!(this instanceof internals.SafeJson)) {
        return new internals.SafeJson(options, transformOptions);
    }

    options = options || {};
    options.objectMode = true;
    transformOptions = transformOptions || {};

    Stream.Transform.call(this, options);

    var config = Hoek.applyToDefaults(internals.defaults, transformOptions);
    this._transformOptions = config;
};


Hoek.inherits(internals.SafeJson, Stream.Transform);


internals.SafeJson.prototype._transform = function (data, enc, next) {

    this.push(Stringify(data) + this._transformOptions.separator);
    next(null);
};
