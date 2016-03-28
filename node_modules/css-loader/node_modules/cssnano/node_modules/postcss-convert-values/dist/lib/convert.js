'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var conversions = [{
    // Length
    'in': 96,
    'px': 1,
    'pt': 4 / 3,
    'pc': 16
}, {
    // Time
    's': 1000,
    'ms': 1
}];

function dropLeadingZero(number) {
    var value = String(number);

    if (value[0] === '0' && number % 1) {
        return value.substring(1);
    }

    if (value[0] === '-' && value[1] === '0' && number % 1) {
        return '-' + value.substring(2);
    }

    return value;
}

exports['default'] = function (number, unit) {
    var converted = undefined,
        value = dropLeadingZero(number) + (unit ? unit : ''),
        conversion = undefined,
        base = undefined;

    conversion = conversions.filter(function (area) {
        return unit in area;
    })[0];

    if (conversion) {
        if (unit === 'ms' || unit === 'px') {
            base = number / conversion[unit];
        } else {
            base = number * conversion[unit];
        }

        converted = Object.keys(conversion).filter(function (u) {
            return unit !== u;
        }).map(function (u) {
            return dropLeadingZero(base / conversion[u]) + u;
        }).reduce(function (a, b) {
            return a.length < b.length ? a : b;
        });

        if (converted.length < value.length) {
            value = converted;
        }
    }

    return value;
};

module.exports = exports['default'];