'use strict';

var space = require('postcss').list.space;

function TRBLCache () {
    if (!(this instanceof TRBLCache)) {
        return new TRBLCache();
    }
    this._sides = {
        top: false,
        right: false,
        bottom: false,
        left: false
    };
}

TRBLCache.prototype.importShorthand = function (shorthand) {
    var properties = space(shorthand);
    if (properties.length === 4) {
        this._sides = {
            top: properties[0],
            right: properties[1],
            bottom: properties[2],
            left: properties[3]
        };
    } else if (properties.length === 3) {
        this._sides = {
            top: properties[0],
            right: properties[1],
            bottom: properties[2],
            left: properties[1]
        };
    } else if (properties.length === 2) {
        this._sides = {
            top: properties[0],
            right: properties[1],
            bottom: properties[0],
            left: properties[1]
        };
    } else if (properties.length === 1) {
        this._sides = {
            top: properties[0],
            right: properties[0],
            bottom: properties[0],
            left: properties[0]
        };
    }
};

TRBLCache.prototype.importTop = function (value) {
    this._sides.top = value;
};

TRBLCache.prototype.importRight = function (value) {
    this._sides.right = value;
};

TRBLCache.prototype.importBottom = function (value) {
    this._sides.bottom = value;
};

TRBLCache.prototype.importLeft = function (value) {
    this._sides.left = value;
};

TRBLCache.prototype.toString = function () {
    var sides = this._sides;
    var values = [sides.top, sides.right, sides.bottom, sides.left];
    if (values[3] === values[1]) {
        values.pop();
        if (values[0] === values[2]) {
            values.pop();
            if (values[0] === values[1]) {
                values.pop();
            }
        }
    }
    return values.join(' ');
};

module.exports = TRBLCache;
