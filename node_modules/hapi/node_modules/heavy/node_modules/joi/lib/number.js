// Load modules

var Any = require('./any');
var Errors = require('./errors');
var Hoek = require('hoek');


// Declare internals

var internals = {};


internals.Number = function () {

    Any.call(this);
    this._type = 'number';
    this._invalids.add(Infinity);
    this._invalids.add(-Infinity);
};

Hoek.inherits(internals.Number, Any);


internals.Number.prototype._base = function (value, state, options) {

    var result = {
        errors: null,
        value: value
    };

    if (typeof value === 'string' &&
        options.convert) {

        var number = parseFloat(value);
        result.value = (isNaN(number) || !isFinite(value)) ? NaN : number;
    }

    var isNumber = typeof result.value === 'number' && !isNaN(result.value);

    if (options.convert && 'precision' in this._flags && isNumber) {
        // This is conceptually equivalent to using toFixed but it should be much faster
        var precision = Math.pow(10, this._flags.precision);
        result.value = Math.round(result.value * precision) / precision;
    }

    result.errors = isNumber ? null : Errors.create('number.base', null, state, options);
    return result;
};


internals.Number.prototype.min = function (limit) {

    Hoek.assert(Hoek.isInteger(limit), 'limit must be an integer');

    return this._test('min', limit, function (value, state, options) {

        if (value >= limit) {
            return null;
        }

        return Errors.create('number.min', { limit: limit }, state, options);
    });
};


internals.Number.prototype.max = function (limit) {

    Hoek.assert(Hoek.isInteger(limit), 'limit must be an integer');

    return this._test('max', limit, function (value, state, options) {

        if (value <= limit) {
            return null;
        }

        return Errors.create('number.max', { limit: limit }, state, options);
    });
};


internals.Number.prototype.greater = function (limit) {

    Hoek.assert(Hoek.isInteger(limit), 'limit must be an integer');

    return this._test('greater', limit, function (value, state, options) {

        if (value > limit) {
            return null;
        }

        return Errors.create('number.greater', { limit: limit }, state, options);
    });
};


internals.Number.prototype.less = function (limit) {

    Hoek.assert(Hoek.isInteger(limit), 'limit must be an integer');

    return this._test('less', limit, function (value, state, options) {

        if (value < limit) {
            return null;
        }

        return Errors.create('number.less', { limit: limit }, state, options);
    });
};


internals.Number.prototype.integer = function () {

    return this._test('integer', undefined, function (value, state, options) {

        return Hoek.isInteger(value) ? null : Errors.create('number.integer', null, state, options);
    });
};


internals.Number.prototype.negative = function () {

    return this._test('negative', undefined, function (value, state, options) {

        if (value < 0) {
            return null;
        }

        return Errors.create('number.negative', null, state, options);
    });
};


internals.Number.prototype.positive = function () {

    return this._test('positive', undefined, function (value, state, options) {

        if (value > 0) {
            return null;
        }

        return Errors.create('number.positive', null, state, options);
    });
};


internals.precisionRx = /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;


internals.Number.prototype.precision = function (limit) {

    Hoek.assert(Hoek.isInteger(limit), 'limit must be an integer');
    Hoek.assert(!('precision' in this._flags), 'precision already set');

    var obj = this._test('precision', limit, function (value, state, options){

        var places = value.toString().match(internals.precisionRx);
        var decimals = Math.max((places[1] ? places[1].length : 0) - (places[2] ? parseInt(places[2], 10) : 0), 0);
        if (decimals <= limit) {
            return null;
        }

        return Errors.create('number.precision', {limit: limit}, state, options);
    });

    obj._flags.precision = limit;
    return obj;
};


module.exports = new internals.Number();
