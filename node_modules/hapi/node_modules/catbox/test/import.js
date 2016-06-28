// Load modules

var Hoek = require('hoek');


// Declare internals

var internals = {};


exports = module.exports = internals.Connection = function (options) {

    this.cache = null;
};


internals.Connection.prototype.start = function (callback) {

    callback = Hoek.nextTick(callback);

    if (!this.cache) {
        this.cache = {};
    }

    return callback();
};


internals.Connection.prototype.stop = function () {

    this.cache = null;
    return;
};


internals.Connection.prototype.isReady = function () {

    return (!!this.cache);
};


internals.Connection.prototype.validateSegmentName = function (name) {

    if (!name) {
        return new Error('Empty string');
    }

    if (name.indexOf('\0') !== -1) {
        return new Error('Includes null character');
    }

    return null;
};


internals.Connection.prototype.get = function (key, callback) {

    callback = Hoek.nextTick(callback);

    if (!this.cache) {
        return callback(new Error('Connection not started'));
    }

    var segment = this.cache[key.segment];
    if (!segment) {
        return callback(null, null);
    }

    var envelope = segment[key.id];
    if (!envelope) {
        return callback(null, null);
    }

    var value = null;
    try {
        value = JSON.parse(envelope.item);
    }
    catch (err) {
        return callback(new Error('Bad value content'));
    }

    var result = {
        item: value,
        stored: envelope.stored,
        ttl: envelope.ttl
    };

    return callback(null, result);
};


internals.Connection.prototype.set = function (key, value, ttl, callback) {

    var self = this;

    callback = Hoek.nextTick(callback);

    if (!this.cache) {
        return callback(new Error('Connection not started'));
    }

    var stringifiedValue = null;
    try {
        stringifiedValue = JSON.stringify(value);
    }
    catch (err) {
        return callback(err);
    }

    var envelope = {
        item: stringifiedValue,
        stored: Date.now(),
        ttl: ttl
    };

    this.cache[key.segment] = this.cache[key.segment] || {};
    var segment = this.cache[key.segment];

    var cachedItem = segment[key.id];
    if (cachedItem && cachedItem.timeoutId) {
        clearTimeout(cachedItem.timeoutId);
    }

    var timeoutId = setTimeout(function () {

        self.drop(key, function () { });
    }, ttl);

    envelope.timeoutId = timeoutId;

    segment[key.id] = envelope;
    return callback(null);
};


internals.Connection.prototype.drop = function (key, callback) {

    callback = Hoek.nextTick(callback);

    if (!this.cache) {
        return callback(new Error('Connection not started'));
    }

    var segment = this.cache[key.segment];
    if (segment) {
        var item = segment[key.id];
        delete segment[key.id];
    }

    return callback();
};
