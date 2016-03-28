(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    var has = require.has;
    if (!has) {
        has = (function () {
            var hasCache = Object.create(null);
            var global = this;
            var document = global.document;
            var element = document && document.createElement('div');
            var has = function (name) {
                return typeof hasCache[name] === 'function' ? (hasCache[name] = hasCache[name](global, document, element)) : hasCache[name];
            };
            has.add = function (name, test, now, force) {
                (!(name in hasCache) || force) && (hasCache[name] = test);
                now && has(name);
            };
            return has;
        })();
        has.add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
        has.add('host-node', typeof process === 'object' && process.versions && process.versions.node);
        has.add('debug', true);
    }
    has.normalize = function (resourceId, normalize) {
        var tokens = resourceId.match(/[\?:]|[^:\?]*/g);
        var i = 0;
        function get(skip) {
            var term = tokens[i++];
            if (term === ':') {
                return null;
            }
            else {
                if (tokens[i++] === '?') {
                    if (!skip && has(term)) {
                        return get();
                    }
                    else {
                        get(true);
                        return get(skip);
                    }
                }
                return term;
            }
        }
        resourceId = get();
        return resourceId && normalize(resourceId);
    };
    has.load = function (resourceId, require, load) {
        if (resourceId) {
            require([resourceId], load);
        }
        else {
            load();
        }
    };
    return has;
});
//# sourceMappingURL=_debug/has.js.map