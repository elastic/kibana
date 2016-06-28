(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './has'], function (require, exports) {
    var has = require('./has');
    has.add('es6-getpropertydescriptor', typeof Object.getPropertyDescriptor === 'function');
    var slice = Array.prototype.slice;
    function getDottedProperty(object, parts, create) {
        var key;
        var i = 0;
        while (object && (key = parts[i++])) {
            if (typeof object !== 'object') {
                return undefined;
            }
            object = key in object ? object[key] : (create ? object[key] = {} : undefined);
        }
        return object;
    }
    function setProperty(object, propertyName, value) {
        var parts = propertyName.split('.');
        var part = parts.pop();
        var property = getDottedProperty(object, parts, true);
        if (property && part) {
            property[part] = value;
            return value;
        }
    }
    exports.setProperty = setProperty;
    function getProperty(object, propertyName, create) {
        if (create === void 0) { create = false; }
        return getDottedProperty(object, propertyName.split('.'), create);
    }
    exports.getProperty = getProperty;
    function _mixin(target, source) {
        for (var name in source) {
            var sourceValue = source[name];
            if (name in target && target[name] === sourceValue) {
                continue;
            }
            target[name] = sourceValue;
        }
        return target;
    }
    function mixin(target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        if (!target) {
            target = {};
        }
        for (var i = 0; i < sources.length; i++) {
            _mixin(target, sources[i]);
        }
        return target;
    }
    exports.mixin = mixin;
    function delegate(object, properties) {
        object = Object.create(object);
        _mixin(object, properties);
        return object;
    }
    exports.delegate = delegate;
    var _bind = Function.prototype.bind;
    function bind(context, fn) {
        var extra = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            extra[_i - 2] = arguments[_i];
        }
        if (typeof fn === 'function') {
            return _bind.apply(fn, [context].concat(extra));
        }
        return function () {
            return context[fn].apply(context, extra.concat(slice.call(arguments, 0)));
        };
    }
    exports.bind = bind;
    function partial(fn) {
        var extra = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            extra[_i - 1] = arguments[_i];
        }
        return function () {
            return fn.apply(this, extra.concat(slice.call(arguments, 0)));
        };
    }
    exports.partial = partial;
    function deepMixin(target, source) {
        if (source && typeof source === 'object') {
            if (Array.isArray(source)) {
                target.length = source.length;
            }
            for (var name in source) {
                var targetValue = target[name];
                var sourceValue = source[name];
                if (targetValue !== sourceValue) {
                    if (sourceValue && typeof sourceValue === 'object') {
                        if (sourceValue instanceof RegExp ||
                            sourceValue instanceof Date ||
                            sourceValue instanceof String ||
                            sourceValue instanceof Number ||
                            sourceValue instanceof Boolean) {
                            target[name] = targetValue = new sourceValue.constructor(sourceValue);
                        }
                        else if (!targetValue || typeof targetValue !== 'object') {
                            target[name] = targetValue = Array.isArray(sourceValue) ? [] : {};
                        }
                        deepMixin(targetValue, sourceValue);
                    }
                    else {
                        target[name] = sourceValue;
                    }
                }
            }
        }
        return target;
    }
    exports.deepMixin = deepMixin;
    function deepDelegate(source, properties) {
        var target = delegate(source);
        for (var name in source) {
            var value = source[name];
            if (value && typeof value === 'object') {
                target[name] = deepDelegate(value);
            }
        }
        return deepMixin(target, properties);
    }
    exports.deepDelegate = deepDelegate;
    function isEqual(a, b) {
        return a === b || (a !== a && b !== b);
    }
    exports.isEqual = isEqual;
    exports.getPropertyDescriptor;
    if (has('es6-getpropertydescriptor')) {
        exports.getPropertyDescriptor = Object.getPropertyDescriptor;
    }
    else {
        exports.getPropertyDescriptor = function (object, property) {
            var descriptor;
            while (object) {
                descriptor = Object.getOwnPropertyDescriptor(object, property);
                if (descriptor) {
                    return descriptor;
                }
                object = Object.getPrototypeOf(object);
            }
            return null;
        };
    }
    function pullFromArray(haystack, needle) {
        var removed = [];
        var i = 0;
        while ((i = haystack.indexOf(needle, i)) > -1) {
            removed.push(haystack.splice(i, 1)[0]);
        }
        return removed;
    }
    exports.pullFromArray = pullFromArray;
});
//# sourceMappingURL=_debug/lang.js.map