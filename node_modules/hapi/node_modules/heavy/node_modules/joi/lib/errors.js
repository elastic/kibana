// Load modules

var Hoek = require('hoek');
var Language = require('./language');


// Declare internals

var internals = {};


internals.Err = function (type, context, state, options) {

    this.type = type;
    this.context = context || {};
    this.context.key = state.key;
    this.path = state.path;
    this.options = options;
};


internals.Err.prototype.toString = function () {

    var self = this;

    var localized = this.options.language;
    this.context.key = localized.label || this.context.key || localized.root || Language.errors.root;

    var format = Hoek.reach(localized, this.type) || Hoek.reach(Language.errors, this.type);
    var hasKey = /\{\{\!?key\}\}/.test(format);
    format = (hasKey ? format : '{{!key}} ' + format);
    var message = format.replace(/\{\{(\!?)([^}]+)\}\}/g, function ($0, isSecure, name) {

        var value = Hoek.reach(self.context, name);
        var normalized = Array.isArray(value) ? value.join(', ') : value.toString();
        return (isSecure ? Hoek.escapeHtml(normalized) : normalized);
    });

    return message;
};


exports.create = function (type, context, state, options) {

    return new internals.Err(type, context, state, options);
};


exports.process = function (errors, object) {

    if (!errors || !errors.length) {
        return null;
    }

    var details = [];
    for (var i = 0, il = errors.length; i < il; ++i) {
        var item = errors[i];
        details.push({
            message: item.toString(),
            path: internals.getPath(item),
            type: item.type,
            context: item.context
        });
    }

    // Construct error

    var message = '';
    details.forEach(function (error) {

        message += (message ? '. ' : '') + error.message;
    });

    var error = new Error(message);
    error.name = 'ValidationError';
    error.details = details;
    error._object = object;
    error.annotate = internals.annotate;
    return error;
};


internals.getPath = function (item) {

    var recursePath = function (it) {

        var reachedItem = Hoek.reach(it, 'context.reason.0');
        if (reachedItem && reachedItem.context) {
            return recursePath(reachedItem);
        }

        return it.path;
    };

    return recursePath(item) || item.context.key;
};


internals.annotate = function () {

    var obj = Hoek.clone(this._object || {});

    var lookup = {};
    var el = this.details.length;
    for (var e = el - 1; e >= 0; --e) {        // Reverse order to process deepest child first
        var pos = el - e;
        var error = this.details[e];
        var path = error.path.split('.');
        var ref = obj;
        for (var i = 0, il = path.length; i < il && ref; ++i) {
            var seg = path[i];
            if (i + 1 < il) {
                ref = ref[seg];
            }
            else {
                var value = ref[seg];
                if (value !== undefined) {
                    delete ref[seg];
                    var label = seg + '_$key$_' + pos + '_$end$_';
                    ref[label] = value;
                    lookup[error.path] = label;
                }
                else if (lookup[error.path]) {
                    var replacement = lookup[error.path];
                    var appended = replacement.replace('_$end$_', ', ' + pos + '_$end$_');
                    ref[appended] = ref[replacement];
                    lookup[error.path] = appended;
                    delete ref[replacement];
                }
                else {
                    ref['_$miss$_' + seg + '|' + pos + '_$end$_'] = '__missing__';
                }
            }
        }
    }

    var annotated = JSON.stringify(obj, null, 2);

    annotated = annotated.replace(/_\$key\$_([, \d]+)_\$end\$_\"/g, function ($0, $1) {

        return '" \u001b[31m[' + $1 + ']\u001b[0m';
    });

    var message = annotated.replace(/\"_\$miss\$_([^\|]+)\|(\d+)_\$end\$_\"\: \"__missing__\"/g, function ($0, $1, $2) {

        return '\u001b[41m"' + $1 + '"\u001b[0m\u001b[31m [' + $2 + ']: -- missing --\u001b[0m';
    });

    message += '\n\u001b[31m';

    for (e = 0; e < el; ++e) {
        message += '\n[' + (e + 1) + '] ' + this.details[e].message;
    }

    message += '\u001b[0m';

    return message;
};

