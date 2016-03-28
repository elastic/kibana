// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var Joi = require('joi');


// Declare internals

var internals = {
    day: 24 * 60 * 60 * 1000
};


exports = module.exports = internals.Policy = function (options, cache, segment) {

    Hoek.assert(this.constructor === internals.Policy, 'Cache Policy must be instantiated using new');

    this._cache = cache;
    this._pendings = {};                                        // id -> [callbacks]
    this.rules(options);

    if (cache) {
        var nameErr = cache.validateSegmentName(segment);
        Hoek.assert(nameErr === null, 'Invalid segment name: ' + segment + (nameErr ? ' (' + nameErr.message + ')' : ''));

        this._segment = segment;
    }
};


internals.Policy.prototype.rules = function (options) {

    this.rule = internals.Policy.compile(options, !!this._cache);
};


internals.Policy.prototype.get = function (key, callback) {     // key: string or { id: 'id' }

    var self = this;

    // Check if request is already pending

    var id = (key && typeof key === 'object') ? key.id : key;
    var pendingsId = '+' + id;                                  // Prefix to avoid conflicts with JS internals (e.g. __proto__)
    if (this._pendings[pendingsId]) {
        this._pendings[pendingsId].push(callback);
        return;
    }

    this._pendings[pendingsId] = [callback];

    // Lookup in cache

    var timer = new Hoek.Timer();
    this._get(id, function (err, cached) {

        // Prepare report

        var report = {
            msec: timer.elapsed(),
            error: err
        };

        if (cached) {
            report.stored = cached.stored;
            report.ttl = cached.ttl;
            var staleIn = typeof self.rule.staleIn === 'function' ? self.rule.staleIn(cached.stored, cached.ttl) : self.rule.staleIn;
            cached.isStale = (staleIn ? (Date.now() - cached.stored) >= staleIn : false);
            report.isStale = cached.isStale;
        }

        // No generate method

        if (!self.rule.generateFunc) {
            return self._finalize(id, err, cached ? cached.item : null, cached, report);
        }

        // Error / Not found

        if (err ||
            !cached) {

            return self._generate(id, key, null, report, callback);
        }

        // Check if found and fresh

        if (!cached.isStale) {
            return self._finalize(id, null, cached.item, cached, report);
        }

        return self._generate(id, key, cached, report, callback);
    });
};


internals.Policy.prototype._get = function (id, callback) {

    if (!this._cache) {
        return Hoek.nextTick(callback)(null, null);
    }

    this._cache.get({ segment: this._segment, id: id }, callback);
};


internals.Policy.prototype._generate = function (id, key, cached, report, callback) {

    var self = this;

    var finalize = Hoek.once(function (id, err, value, cached, report) {

        return self._finalize(id, err, value, cached, report);
    });

    if (cached) {                                       // Must be stale

        // Set stale timeout

        cached.ttl -= this.rule.staleTimeout;           // Adjust TTL for when the timeout is invoked (staleTimeout must be valid if isStale is true)
        if (cached.ttl > 0) {
            setTimeout(function () {

                return finalize(id, null, cached.item, cached, report);
            }, this.rule.staleTimeout);
        }
    }
    else if (this.rule.generateTimeout) {

        // Set item generation timeout (when not in cache)

        setTimeout(function () {

            return finalize(id, Boom.serverTimeout(), null, null, report);
        }, this.rule.generateTimeout);
    }

    // Generate new value

    try {
        this.rule.generateFunc.call(null, key, function (err, value, ttl) {

            // Error (if dropOnError is not set to false) or not cached

            if ((err && self.rule.dropOnError) ||
                ttl === 0) {                                    // null or undefined means use policy

                self.drop(id);                                  // Invalidate cache
            }
            else if (!err) {
                self.set(id, value, ttl);                       // Lazy save (replaces stale cache copy with late-coming fresh copy)
            }

            if (cached &&
                err &&
                !self.rule.dropOnError) {

                return finalize(id, err, cached.item, cached, report);
            }

            return finalize(id, err, value, null, report);      // Ignored if stale value already returned
        });
    }
    catch (err) {
        return finalize(id, err, null, null, report);
    }
};


internals.Policy.prototype._finalize = function (id, err, value, cached, report) {

    id = '+' + id;
    var pendings = this._pendings[id];
    delete this._pendings[id];

    for (var i = 0, il = pendings.length; i < il; ++i) {
        Hoek.nextTick(pendings[i])(err, value, cached, report);
    }
};


internals.Policy.prototype.set = function (key, value, ttl, callback) {

    callback = callback || Hoek.ignore;

    if (!this._cache) {
        return callback(null);
    }

    ttl = ttl || internals.Policy.ttl(this.rule);
    var id = (key && typeof key === 'object') ? key.id : key;
    this._cache.set({ segment: this._segment, id: id }, value, ttl, callback);
};


internals.Policy.prototype.drop = function (id, callback) {

    callback = callback || Hoek.ignore;

    if (!this._cache) {
        return callback(null);
    }

    this._cache.drop({ segment: this._segment, id: id }, callback);
};


internals.Policy.prototype.ttl = function (created) {

    return internals.Policy.ttl(this.rule, created);
};


internals.schema = Joi.object({
    expiresIn: Joi.number().integer().min(1),
    expiresAt: Joi.string().regex(/^\d\d?\:\d\d$/),
    staleIn: [Joi.number().integer().min(1).max(86400000 - 1), Joi.func()],               // One day - 1 (max is inclusive)
    staleTimeout: Joi.number().integer().min(1),
    generateFunc: Joi.func(),
    generateTimeout: Joi.number().integer().min(1),
    dropOnError: Joi.boolean(),

    // Ignored external keys (hapi)

    privacy: Joi.any(),
    cache: Joi.any(),
    segment: Joi.any(),
    shared: Joi.any()
})
    .without('expiresIn', 'expiresAt')
    .with('staleIn', 'generateFunc')
    .with('generateTimeout', 'generateFunc')
    .with('dropOnError', 'generateFunc')
    .and('staleIn', 'staleTimeout');


internals.Policy.compile = function (options, serverSide) {

    /*
        {
            expiresIn: 30000,
            expiresAt: '13:00',

            generateFunc: function (id, next) { next(err, result, ttl); }
            generateTimeout: 500,
            staleIn: 20000,
            staleTimeout: 500,
            dropOnError: true
        }
     */

    var rule = {};

    if (!options ||
        !Object.keys(options).length) {

        return rule;
    }

    // Validate rule

    Joi.assert(options, internals.schema, 'Invalid cache policy configuration');

    var hasExpiresIn = options.expiresIn !== undefined && options.expiresIn !== null;
    var hasExpiresAt = options.expiresAt !== undefined && options.expiresAt !== null;

    Hoek.assert(!hasExpiresAt || typeof options.expiresAt === 'string', 'expiresAt must be a string', options);
    Hoek.assert(!hasExpiresIn || Hoek.isInteger(options.expiresIn), 'expiresIn must be an integer', options);
    Hoek.assert(!hasExpiresIn || !options.staleIn || typeof options.staleIn === 'function' || options.staleIn < options.expiresIn, 'staleIn must be less than expiresIn');
    Hoek.assert(!options.staleIn || serverSide, 'Cannot use stale options without server-side caching');
    Hoek.assert(!options.staleTimeout || !hasExpiresIn || options.staleTimeout < options.expiresIn, 'staleTimeout must be less than expiresIn');
    Hoek.assert(!options.staleTimeout || !hasExpiresIn || typeof options.staleIn === 'function' || options.staleTimeout < (options.expiresIn - options.staleIn), 'staleTimeout must be less than the delta between expiresIn and staleIn');

    // Expiration

    if (hasExpiresAt) {

        // expiresAt

        var time = /^(\d\d?):(\d\d)$/.exec(options.expiresAt);
        rule.expiresAt = {
            hours: parseInt(time[1], 10),
            minutes: parseInt(time[2], 10)
        };
    }
    else {

        // expiresIn

        rule.expiresIn = options.expiresIn || 0;
    }

    // generateTimeout

    if (options.generateFunc) {
        rule.generateFunc = options.generateFunc;
        rule.generateTimeout = options.generateTimeout;

        // Stale

        if (options.staleIn) {
            rule.staleIn = options.staleIn;
            rule.staleTimeout = options.staleTimeout;
        }

        rule.dropOnError = options.dropOnError !== undefined ? options.dropOnError : true;      // Defaults to true
    }

    return rule;
};


internals.Policy.ttl = function (rule, created, now) {

    now = now || Date.now();
    created = created || now;
    var age = now - created;

    if (age < 0) {
        return 0;                                                                   // Created in the future, assume expired/bad
    }

    if (rule.expiresIn) {
        return Math.max(rule.expiresIn - age, 0);
    }

    if (rule.expiresAt) {
        if (age > internals.day) {                                                  // If the item was created more than a 24 hours ago
            return 0;
        }

        var expiresAt = new Date(created);                                          // Compare expiration time on the same day
        expiresAt.setHours(rule.expiresAt.hours);
        expiresAt.setMinutes(rule.expiresAt.minutes);
        expiresAt.setSeconds(0);
        expiresAt.setMilliseconds(0);
        var expires = expiresAt.getTime();

        if (expires <= created) {
            expires += internals.day;                                               // Move to tomorrow
        }

        if (now >= expires) {                                                       // Expired
            return 0;
        }

        return expires - now;
    }

    return 0;                                                                       // No rule
};


internals.Policy.prototype.isReady = function () {

    if (!this._cache) {
        return false;
    }

    return this._cache.connection.isReady();
};
