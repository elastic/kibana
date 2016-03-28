'use strict';

function LayerCache () {
    if (!(this instanceof LayerCache)) {
        return new LayerCache();
    }
    this._values = [];
}

function sortAscending (key) {
    return function (a, b) {
        return a[key] - b[key];
    };
}

function mapValues (value, index) {
    return {
        from: value.from,
        to: index + 1
    };
}

LayerCache.prototype._filterValues = function (value) {
    return this._values.filter(function (index) {
        return index.from === parseInt(value, 10);
    });
};

LayerCache.prototype._optimiseValues = function () {
    this._values = this._values.sort(sortAscending('from')).map(mapValues);
};

LayerCache.prototype.addValue = function (value) {
    if (!this._filterValues(value).length && value > 0) {
        this._values.push({ from: parseInt(value, 10) });
        this._optimiseValues();
    }
};

LayerCache.prototype.convert = function (value) {
    var match = this._filterValues(value)[0];
    return match && match.to || value;
};

module.exports = LayerCache;
