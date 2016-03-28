// Load modules

var Net = require('net');
var Hoek = require('hoek');
var Isemail = require('isemail');
var Any = require('./any');
var JoiDate = require('./date');
var Errors = require('./errors');

// Declare internals

var internals = {};


internals.String = function () {

    Any.call(this);
    this._type = 'string';
    this._invalids.add('');
};

Hoek.inherits(internals.String, Any);


internals.String.prototype._base = function (value, state, options) {

    if (typeof value === 'string' &&
        options.convert) {

        if (this._flags.case) {
            value = (this._flags.case === 'upper' ? value.toLocaleUpperCase() : value.toLocaleLowerCase());
        }

        if (this._flags.trim) {
            value = value.trim();
        }
    }

    return {
        value: value,
        errors: (typeof value === 'string') ? null : Errors.create('string.base', null, state, options)
    };
};


internals.String.prototype.insensitive = function () {

    var obj = this.clone();
    obj._flags.insensitive = true;
    return obj;
};


internals.String.prototype.min = function (limit, encoding) {

    Hoek.assert(Hoek.isInteger(limit) && limit >= 0, 'limit must be a positive integer');
    Hoek.assert(!encoding || Buffer.isEncoding(encoding), 'Invalid encoding:', encoding);

    return this._test('min', limit, function (value, state, options) {

        var length = encoding ? Buffer.byteLength(value, encoding) : value.length;
        if (length >= limit) {
            return null;
        }

        return Errors.create('string.min', { limit: limit }, state, options);
    });
};


internals.String.prototype.max = function (limit, encoding) {

    Hoek.assert(Hoek.isInteger(limit) && limit >= 0, 'limit must be a positive integer');
    Hoek.assert(!encoding || Buffer.isEncoding(encoding), 'Invalid encoding:', encoding);

    return this._test('max', limit, function (value, state, options) {

        var length = encoding ? Buffer.byteLength(value, encoding) : value.length;
        if (length <= limit) {
            return null;
        }

        return Errors.create('string.max', { limit: limit }, state, options);
    });
};


internals.String.prototype.creditCard = function () {

    return this._test('creditCard', undefined, function (value, state, options) {

        var i = value.length;
        var sum = 0;
        var mul = 1;
        var char;

        while (i--) {
            char = value.charAt(i) * mul;
            sum += char - (char > 9) * 9;
            mul ^= 3;
        }

        var check =  (sum % 10 === 0) && (sum > 0);
        return check ? null : Errors.create('string.creditCard', null, state, options);
    });
};


internals.String.prototype.length = function (limit, encoding) {

    Hoek.assert(Hoek.isInteger(limit) && limit >= 0, 'limit must be a positive integer');
    Hoek.assert(!encoding || Buffer.isEncoding(encoding), 'Invalid encoding:', encoding);

    return this._test('length', limit, function (value, state, options) {

        var length = encoding ? Buffer.byteLength(value, encoding) : value.length;
        if (length === limit) {
            return null;
        }

        return Errors.create('string.length', { limit: limit }, state, options);
    });
};


internals.String.prototype.regex = function (pattern, name) {

    Hoek.assert(pattern instanceof RegExp, 'pattern must be a RegExp');

    pattern = new RegExp(pattern.source, pattern.ignoreCase ? 'i' : undefined);         // Future version should break this and forbid unsupported regex flags

    return this._test('regex', pattern, function (value, state, options) {

        if (pattern.test(value)) {
            return null;
        }

        return Errors.create((name ? 'string.regex.name' : 'string.regex.base'), { name: name }, state, options);
    });
};


internals.String.prototype.alphanum = function () {

    return this._test('alphanum', undefined, function (value, state, options) {

        if (/^[a-zA-Z0-9]+$/.test(value)) {
            return null;
        }

        return Errors.create('string.alphanum', null, state, options);
    });
};


internals.String.prototype.token = function () {

    return this._test('token', undefined, function (value, state, options) {

        if (/^\w+$/.test(value)) {
            return null;
        }

        return Errors.create('string.token', null, state, options);
    });
};


internals.String.prototype.email = function () {

    return this._test('email', undefined, function (value, state, options) {

        if (Isemail(value)) {
            return null;
        }

        return Errors.create('string.email', null, state, options);
    });
};


internals.String.prototype.isoDate = function () {

    return this._test('isoDate', undefined, function (value, state, options) {

        if (JoiDate._isIsoDate(value)) {
            return null;
        }

        return Errors.create('string.isoDate', null, state, options);
    });
};


internals.String.prototype.guid = function () {

    var regex = /^[A-F0-9]{8}(?:-?[A-F0-9]{4}){3}-?[A-F0-9]{12}$/i;
    var regex2 = /^\{[A-F0-9]{8}(?:-?[A-F0-9]{4}){3}-?[A-F0-9]{12}\}$/i;

    return this._test('guid', undefined, function (value, state, options) {

        if (regex.test(value) || regex2.test(value)) {
            return null;
        }

        return Errors.create('string.guid', null, state, options);
    });
};


internals.String.prototype.hostname = function () {

    var regex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

    return this._test('hostname', undefined, function (value, state, options) {

        if ((value.length <= 255 && regex.test(value)) ||
            Net.isIPv6(value)) {

            return null;
        }

        return Errors.create("string.hostname", null, state, options);
    });
};


internals.String.prototype.lowercase = function () {

    var obj = this._test('lowercase', undefined, function (value, state, options) {

        if (options.convert ||
            value === value.toLocaleLowerCase()) {

            return null;
        }

        return Errors.create('string.lowercase', null, state, options);
    });

    obj._flags.case = 'lower';
    return obj;
};


internals.String.prototype.uppercase = function (options) {

    var obj = this._test('uppercase', undefined, function (value, state, options) {

        if (options.convert ||
            value === value.toLocaleUpperCase()) {

            return null;
        }

        return Errors.create('string.uppercase', null, state, options);
    });

    obj._flags.case = 'upper';
    return obj;
};


internals.String.prototype.trim = function () {

    var obj = this._test('trim', undefined, function (value, state, options) {

        if (options.convert ||
            value === value.trim()) {

            return null;
        }

        return Errors.create('string.trim', null, state, options);
    });

    obj._flags.trim = true;
    return obj;
};


module.exports = new internals.String();
