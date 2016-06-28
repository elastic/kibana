// Load modules

var Path = require('path');
var Hoek = require('hoek');
var MimeDb = require('mime-db');


// Declare internals

var internals = {};


internals.compressibleRx = /^text\/|\+json$|\+text$|\+xml$/;


module.exports = internals.Mimos = function (options) {

    options = options || {};

    Hoek.assert(this.constructor === internals.Mimos, 'Mimos must be created with new');

    var result = options.override ? internals.compile(options.override) : internals.base;
    this._byType = result.byType;
    this._byExtension = result.byExtension;
};


internals.compile = function (override) {

    var db = Hoek.clone(MimeDb);
    Hoek.merge(db, override, true, false);

    var result = {
        byType: db,
        byExtension: {}
    };

    var keys = Object.keys(result.byType);
    for (var i = 0, il = keys.length; i < il; i++) {
        var type = keys[i];
        var mime = result.byType[type];
        mime.type = mime.type || type;
        mime.source = mime.source || 'mime-db';
        mime.extensions = mime.extensions || [];
        mime.compressible = (mime.compressible !== undefined ? mime.compressible : internals.compressibleRx.test(type));

        Hoek.assert(!mime.predicate || typeof mime.predicate === 'function', 'predicate option must be a function');

        for (var j = 0, jl = mime.extensions.length; j < jl; j++) {
            var ext = mime.extensions[j];
            result.byExtension[ext] = mime;
        }
    }

    return result;
};


internals.base = internals.compile();       // Prevents an expensive copy on each constructor when no customization is needed


internals.Mimos.prototype.path = function (path) {

    var extension = Path.extname(path).slice(1).toLowerCase();
    var mime = this._byExtension[extension] || {};

    if (mime.predicate) {
         return mime.predicate(Hoek.clone(mime));
    }

    return mime;
};


internals.Mimos.prototype.type = function (type) {

    type = type.split(';', 1)[0].trim().toLowerCase();
    var mime = this._byType[type];
    if (!mime) {
        mime = {
            type: type,
            source: 'mimos',
            extensions: [],
            compressible: internals.compressibleRx.test(type)
        };

        this._byType[type] = mime;
        return mime;
    }

    if (mime.predicate) {
        return mime.predicate(Hoek.clone(mime));
    }

    return mime;
};