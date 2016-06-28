(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './lang'], function (require, exports) {
    var lang = require('./lang');
    function repeat(string, times) {
        if (!string || times <= 0) {
            return '';
        }
        var buffer = [];
        while (true) {
            if (times & 1) {
                buffer.push(string);
            }
            times >>= 1;
            if (!times) {
                break;
            }
            string += string;
        }
        return buffer.join('');
    }
    exports.repeat = repeat;
    var Padding;
    (function (Padding) {
        Padding[Padding["Left"] = 0] = "Left";
        Padding[Padding["Right"] = 1] = "Right";
        Padding[Padding["Both"] = 2] = "Both";
    })(Padding || (Padding = {}));
    ;
    function _pad(text, size, character, position) {
        if (position === void 0) { position = Padding.Right; }
        var length = size - text.length, pad = exports.repeat(character, Math.ceil(length / character.length));
        if (position === Padding.Left) {
            return pad + text;
        }
        else if (position === Padding.Right) {
            return text + pad;
        }
        else {
            var left = Math.ceil(length / 2);
            return pad.substr(0, left) + text + pad.substr(0, length - left);
        }
    }
    function pad(text, size, character) {
        if (character === void 0) { character = ' '; }
        return _pad(text, size, character, Padding.Both);
    }
    exports.pad = pad;
    function padr(text, size, character) {
        if (character === void 0) { character = ' '; }
        return _pad(text, size, character, Padding.Right);
    }
    exports.padr = padr;
    function padl(text, size, character) {
        if (character === void 0) { character = ' '; }
        return _pad(text, size, character, Padding.Left);
    }
    exports.padl = padl;
    var substitutePattern = /\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g;
    function defaultTransform(value) {
        return value;
    }
    ;
    function substitute(template, map, transform, context) {
        context = context || undefined;
        transform = transform ? transform.bind(context) : defaultTransform;
        return template.replace(substitutePattern, function (match, key, format) {
            var value = lang.getProperty(map, key);
            if (format) {
                value = lang.getProperty(context, format).call(context, value, key);
            }
            return transform(value, key) + '';
        });
    }
    exports.substitute = substitute;
    function count(haystack, needle) {
        var hits = 0, lastIndex = haystack.indexOf(needle);
        while (lastIndex > -1) {
            ++hits;
            lastIndex = haystack.indexOf(needle, lastIndex + 1);
        }
        return hits;
    }
    exports.count = count;
    var regExpPattern = /[-\[\]{}()*+?.,\\\^$|#\s]/g;
    function escapeRegExpString(string) {
        return string.replace(regExpPattern, '\\$&');
    }
    exports.escapeRegExpString = escapeRegExpString;
});
//# sourceMappingURL=_debug/string.js.map