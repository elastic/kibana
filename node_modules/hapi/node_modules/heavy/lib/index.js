// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var Joi = require('joi');


// Declare internals

var internals = {};


internals.schema = {
    process: Joi.object({
        sampleInterval: Joi.number().min(0)
    }),
    policy: Joi.object({
        maxHeapUsedBytes: Joi.number().min(0),
        maxEventLoopDelay: Joi.number().min(0),
        maxRssBytes: Joi.number().min(0)
    })
};


internals.defaults = {
    process: {
        sampleInterval: 0                           // Frequency of load sampling in milliseconds (zero is no sampling)
    },
    policy: {
        maxHeapUsedBytes: 0,                        // Reject requests when V8 heap is over size in bytes (zero is no max)
        maxRssBytes: 0,                             // Reject requests when process RSS is over size in bytes (zero is no max)
        maxEventLoopDelay: 0                        // Milliseconds of delay after which requests are rejected (zero is no max)
    }
};


exports = module.exports = internals.Heavy = function (options) {

    options = options || {};

    Joi.assert(options, internals.schema.process, 'Invalid load monitoring options');
    this.settings = Hoek.applyToDefaults(internals.defaults, options);

    this._eventLoopTimer = null;
    this._loadBench = new Hoek.Bench();
    this.load = {
        eventLoopDelay: 0,
        heapUsed: 0,
        rss: 0
    };
};


internals.Heavy.prototype.start = function () {

    var self = this;

    if (!this.settings.sampleInterval) {
        return;
    }

    var loopSample = function () {

        self._loadBench.reset();
        var measure = function () {

            var mem = process.memoryUsage();

            // Retain the same this.load object to keep external references valid

            self.load.eventLoopDelay = (self._loadBench.elapsed() - self.settings.sampleInterval);
            self.load.heapUsed = mem.heapUsed;
            self.load.rss = mem.rss;

            loopSample();
        };

        self._eventLoopTimer = setTimeout(measure, self.settings.sampleInterval);
    };

    loopSample();
};


internals.Heavy.prototype.stop = function () {

    clearTimeout(this._eventLoopTimer);
    this._eventLoopTimer = null;
};


internals.Heavy.prototype.policy = function (options) {

    return new internals.Policy(this, options);
};


internals.Policy = function (process, options) {

    options = options || {};

    Joi.assert(options, internals.schema.policy, 'Invalid load monitoring options');
    Hoek.assert(process.settings.sampleInterval || (!options.maxEventLoopDelay && !options.maxHeapUsedBytes && !options.maxRssBytes), 'Load sample interval must be set to enable load limits');

    this._process = process;
    this.settings = Hoek.applyToDefaults(internals.defaults.policy, options);
};


internals.Policy.prototype.check = function () {

    if (!this._process.settings.sampleInterval) {
        return null;
    }

    Hoek.assert(this._process._eventLoopTimer, 'Cannot check load when sampler is not started');

    var elapsed = this._process._loadBench.elapsed();
    var load = this._process.load;

    if (elapsed > this._process.settings.sampleInterval) {
        load.eventLoopDelay = Math.max(load.eventLoopDelay, elapsed - this._process.settings.sampleInterval);
    }

    if (this.settings.maxEventLoopDelay &&
        load.eventLoopDelay > this.settings.maxEventLoopDelay) {

        return Boom.serverTimeout('Server under heavy load (event loop)', load);
    }

    if (this.settings.maxHeapUsedBytes &&
        load.heapUsed > this.settings.maxHeapUsedBytes) {

        return Boom.serverTimeout('Server under heavy load (heap)', load);
    }

    if (this.settings.maxRssBytes &&
        load.rss > this.settings.maxRssBytes) {

        return Boom.serverTimeout('Server under heavy load (rss)', load);
    }

    return null;
};
