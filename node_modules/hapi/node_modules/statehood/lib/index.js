// Load modules

var Boom = require('boom');
var Cryptiles = require('cryptiles');
var Hoek = require('hoek');
var Iron = require('iron');
var Items = require('items');
var Joi = require('joi');
var Querystring = require('querystring');


// Declare internals

var internals = {};


internals.schema = Joi.object({
    strictHeader: Joi.boolean(),
    ignoreErrors: Joi.boolean(),
    isSecure: Joi.boolean(),
    isHttpOnly: Joi.boolean(),
    path: Joi.string().allow(null),
    domain: Joi.string().allow(null),
    ttl: Joi.number().allow(null),
    encoding: Joi.string().valid('base64json', 'base64', 'form', 'iron', 'none'),
    sign: Joi.object({
        password: [Joi.string(), Joi.binary(), Joi.object()],
        integrity: Joi.object()
    }),
    iron: Joi.object(),
    password: [Joi.string(), Joi.binary(), Joi.object()],

    // Used by hapi

    clearInvalid: Joi.boolean(),
    autoValue: Joi.any(),
    passThrough: Joi.boolean()
});


internals.defaults = {
    strictHeader: true,                             // Require an RFC 6265 compliant header format
    ignoreErrors: false,
    isSecure: false,
    isHttpOnly: false,
    path: null,
    domain: null,
    ttl: null,                                      // MSecs, 0 means remove
    encoding: 'none'                                // options: 'base64json', 'base64', 'form', 'iron', 'none'
};


exports.Definitions = internals.Definitions = function (options) {

    this.settings = Hoek.applyToDefaults(internals.defaults, options || {});
    Joi.assert(this.settings, internals.schema, 'Invalid state definition defaults');

    this.cookies = {};
    this.names = [];
};


internals.Definitions.prototype.add = function (name, options) {

    Hoek.assert(name && typeof name === 'string', 'Invalid name');
    Hoek.assert(!this.cookies[name], 'State already defined:', name);

    var settings = Hoek.applyToDefaults(this.settings, options || {}, true);
    Joi.assert(settings, internals.schema, 'Invalid state definition: ' + name);

    this.cookies[name] = settings;
    this.names.push(name);
};


internals.empty = new internals.Definitions();


// Header format

//                      1: name                2: quoted  3: value
internals.parseRx = /\s*([^=\s]+)\s*=\s*(?:(?:"([^\"]*)")|([^\;]*))(?:(?:;\s*)|$)/g;

internals.validateRx = {
    nameRx: {
        strict: /^[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+$/,
        loose: /^[^=\s]+$/
    },
    valueRx: {
        strict: /^[^\x00-\x20\"\,\;\\\x7F]*$/,
        loose: /^(?:"([^\"]*)")|(?:[^\;]*)$/
    },
    domainRx: /^\.?[a-z\d]+(?:(?:[a-z\d]*)|(?:[a-z\d\-]*[a-z\d]))(?:\.[a-z\d]+(?:(?:[a-z\d]*)|(?:[a-z\d\-]*[a-z\d])))*$/,
    domainLabelLenRx: /^\.?[a-z\d\-]{1,63}(?:\.[a-z\d\-]{1,63})*$/,
    pathRx: /^\/[^\x00-\x1F\;]*$/
};

//                      1: name         2: value
internals.pairsRx = /\s*([^=\s]+)\s*=\s*([^\;]*)(?:(?:;\s*)|$)/g;


internals.Definitions.prototype.parse = function (cookies, next) {

    var self = this;

    var state = {};
    var names = [];
    var verify = cookies.replace(internals.parseRx, function ($0, $1, $2, $3) {

        var name = $1;
        var value = $2 || $3 || '';

        if (state[name]) {
            if (!Array.isArray(state[name])) {
                state[name] = [state[name]];
            }

            state[name].push(value);
        }
        else {
            state[name] = value;
            names.push(name);
        }

        return '';
    });

    // Validate cookie header syntax

    if (verify !== '') {
        return next(Boom.badRequest('Invalid cookie header'), null, []);
    }

    // Collect errors

    var failed = [];                                                // All errors
    var errored = [];                                               // Unignored errors
    var record = function (reason, name, value, definition) {

        var details = {
            name: name,
            value: value,
            settings: definition,
            reason: typeof reason === 'string' ? reason : reason.message
        };

        failed.push(details);
        if (!definition.ignoreErrors) {
            errored.push(details);
        }
    };

    // Parse cookies

    var parsed = {};
    Items.serial(names, function (name, nextName) {

        var value = state[name];
        var definition = self.cookies[name] || self.settings;

        // Validate cookie

        if (definition.strictHeader) {
            if (!name.match(internals.validateRx.nameRx.strict)) {
                record('Invalid cookie name', name, value, definition);
                return nextName();
            }

            var values = [].concat(state[name]);
            for (var v = 0, vl = values.length; v < vl; ++v) {
                if (!values[v].match(internals.validateRx.valueRx.strict)) {
                    record('Invalid cookie value', name, value, definition);
                    return nextName();
                }
            }
        }

        // Check cookie format

        if (definition.encoding === 'none') {
            parsed[name] = value;
            return nextName();
        }

        // Single value

        if (!Array.isArray(value)) {
            internals.unsign(name, value, definition, function (err, unsigned) {

                if (err) {
                    record(err, name, value, definition);
                    return nextName();
                }

                internals.decode(unsigned, definition, function (err, result) {

                    if (err) {
                        record(err, name, value, definition);
                        return nextName();
                    }

                    parsed[name] = result;
                    return nextName();
                });
            });

            return;
        }

        // Array

        var arrayResult = [];
        Items.serial(value, function (arrayValue, nextArray) {

            internals.unsign(name, arrayValue, definition, function (err, unsigned) {

                if (err) {
                    record(err, name, value, definition);
                    return nextName();
                }

                internals.decode(unsigned, definition, function (err, result) {

                    if (err) {
                        record(err, name, value, definition);
                        return nextName();
                    }

                    arrayResult.push(result);
                    nextArray();
                });
            });
        },
        function (err) {

            parsed[name] = arrayResult;
            return nextName();
        });
    },
    function (err) {

        return next(errored.length ? Boom.badRequest('Invalid cookie value', errored) : null, parsed, failed);
    });
};


internals.macPrefix = 'hapi.signed.cookie.1';


internals.unsign = function (name, value, definition, next) {

    if (!definition.sign) {
        return next(null, value);
    }

    var pos = value.lastIndexOf('.');
    if (pos === -1) {
        return next(Boom.badRequest('Missing signature separator'));
    }

    var unsigned = value.slice(0, pos);
    var sig = value.slice(pos + 1);

    if (!sig) {
        return next(Boom.badRequest('Missing signature'));
    }

    var sigParts = sig.split('*');
    if (sigParts.length !== 2) {
        return next(Boom.badRequest('Invalid signature format'));
    }

    var hmacSalt = sigParts[0];
    var hmac = sigParts[1];

    var macOptions = Hoek.clone(definition.sign.integrity || Iron.defaults.integrity);
    macOptions.salt = hmacSalt;
    Iron.hmacWithPassword(definition.sign.password, macOptions, [internals.macPrefix, name, unsigned].join('\n'), function (err, mac) {

        if (err) {
            return next(err);
        }

        if (!Cryptiles.fixedTimeComparison(mac.digest, hmac)) {
            return next(Boom.badRequest('Invalid hmac value'));
        }

        return next(null, unsigned);
    });
};


internals.decode = function (value, definition, next) {

    // Encodings: 'base64json', 'base64', 'form', 'iron', 'none'

    if (definition.encoding === 'iron') {
        Iron.unseal(value, definition.password, definition.iron || Iron.defaults, function (err, unsealed) {

            if (err) {
                return next(err);
            }

            return next(null, unsealed);
        });

        return;
    }

    var result = value;

    try {
        switch (definition.encoding) {
            case 'base64json':
                var decoded = (new Buffer(value, 'base64')).toString('binary');
                result = JSON.parse(decoded);
                break;
            case 'base64':
                result = (new Buffer(value, 'base64')).toString('binary');
                break;
            case 'form':
                result = Querystring.parse(value);
                break;
        }
    }
    catch (err) {
        return next(err);
    }

    return next(null, result);
};


internals.Definitions.prototype.format = function (cookies, callback) {

    var self = this;

    if (!cookies ||
        (Array.isArray(cookies) && !cookies.length)) {

        return Hoek.nextTick(callback)(null, []);
    }

    if (!Array.isArray(cookies)) {
        cookies = [cookies];
    }

    var header = [];
    Items.serial(cookies, function (cookie, next) {

        // Apply definition to local configuration

        var base = self.cookies[cookie.name] || self.settings;
        var definition = cookie.options ? Hoek.applyToDefaults(base, cookie.options, true) : base;

        // Validate name

        var nameRx = (definition.strictHeader ? internals.validateRx.nameRx.strict : internals.validateRx.nameRx.loose);
        if (!nameRx.test(cookie.name)) {
            return callback(Boom.badImplementation('Invalid cookie name: ' + cookie.name));
        }

        // Prepare value (encode, sign)

        exports.prepareValue(cookie.name, cookie.value, definition, function (err, value) {

            if (err) {
                return callback(err);
            }

            // Validate prepared value

            var valueRx = (definition.strictHeader ? internals.validateRx.valueRx.strict : internals.validateRx.valueRx.loose);
            if (value &&
                (typeof value !== 'string' || !value.match(valueRx))) {

                return callback(Boom.badImplementation('Invalid cookie value: ' + cookie.value));
            }

            // Construct cookie

            var segment = cookie.name + '=' + (value || '');

            if (definition.ttl !== null &&
                definition.ttl !== undefined) {            // Can be zero

                var expires = new Date(definition.ttl ? Date.now() + definition.ttl : 0);
                segment += '; Max-Age=' + Math.floor(definition.ttl / 1000) + '; Expires=' + expires.toUTCString();
            }

            if (definition.isSecure) {
                segment += '; Secure';
            }

            if (definition.isHttpOnly) {
                segment += '; HttpOnly';
            }

            if (definition.domain) {
                var domain = definition.domain.toLowerCase();
                if (!domain.match(internals.validateRx.domainLabelLenRx)) {
                    return callback(Boom.badImplementation('Cookie domain too long: ' + definition.domain));
                }

                if (!domain.match(internals.validateRx.domainRx)) {
                    return callback(Boom.badImplementation('Invalid cookie domain: ' + definition.domain));
                }

                segment += '; Domain=' + domain;
            }

            if (definition.path) {
                if (!definition.path.match(internals.validateRx.pathRx)) {
                    return callback(Boom.badImplementation('Invalid cookie path: ' + definition.path));
                }

                segment += '; Path=' + definition.path;
            }

            header.push(segment);
            return next();
        });
    },
    function (err) {

        return callback(null, header);
    });
};


exports.prepareValue = function (name, value, options, callback) {

    Hoek.assert(options && typeof options === 'object', 'Missing or invalid options');

    // Encode value

    internals.encode(value, options, function (err, encoded) {

        if (err) {
            return callback(Boom.badImplementation('Failed to encode cookie (' + name + ') value: ' + err.message));
        }

        // Sign cookie

        internals.sign(name, encoded, options.sign, function (err, signed) {

            if (err) {
                return callback(Boom.badImplementation('Failed to sign cookie (' + name + ') value: ' + err.message));
            }

            return callback(null, signed);
        });
    });
};


internals.encode = function (value, options, callback) {

    callback = Hoek.nextTick(callback);

    // Encodings: 'base64json', 'base64', 'form', 'iron', 'none'

    if (value === undefined) {
        return callback(null, value);
    }

    if (options.encoding === 'none') {
        return callback(null, value);
    }

    if (options.encoding === 'iron') {
        Iron.seal(value, options.password, options.iron || Iron.defaults, function (err, sealed) {

            if (err) {
                return callback(err);
            }

            return callback(null, sealed);
        });

        return;
    }

    var result = value;

    try {
        switch (options.encoding) {
            case 'base64':
                result = (new Buffer(value, 'binary')).toString('base64');
                break;
            case 'base64json':
                var stringified = JSON.stringify(value);
                result = (new Buffer(stringified, 'binary')).toString('base64');
                break;
            case 'form':
                result = Querystring.stringify(value);
                break;
        }
    }
    catch (err) {
        return callback(err);
    }

    return callback(null, result);
};


internals.sign = function (name, value, options, callback) {

    if (value === undefined ||
        !options) {

        return Hoek.nextTick(callback)(null, value);
    }

    Iron.hmacWithPassword(options.password, options.integrity || Iron.defaults.integrity, [internals.macPrefix, name, value].join('\n'), function (err, mac) {

        if (err) {
            return callback(err);
        }

        var signed = value + '.' + mac.salt + '*' + mac.digest;
        return callback(null, signed);
    });
};


internals.Definitions.prototype.passThrough = function (header, fallback) {

    if (!this.names.length) {
        return header;
    }

    var exclude = [];
    for (var i = 0, il = this.names.length; i < il; ++i) {
        var name = this.names[i];
        var definition = this.cookies[name];
        var passCookie = definition.passThrough !== undefined ? definition.passThrough : fallback;
        if (!passCookie) {
            exclude.push(name);
        }
    }

    return exports.exclude(header, exclude);
};


exports.exclude = function (cookies, excludes) {

    var result = '';
    var verify = cookies.replace(internals.pairsRx, function ($0, $1, $2) {

        if (excludes.indexOf($1) === -1) {
            result += (result ? ';' : '') + $1 + '=' + $2;
        }

        return '';
    });

    return verify === '' ? result : Boom.badRequest('Invalid cookie header');
};
