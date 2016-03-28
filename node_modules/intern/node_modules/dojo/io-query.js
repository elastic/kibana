/**
 * @module dojo/io-query
 *
 * This module defines query string processing functions.
 */
(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    function objectToQuery(map) {
        var query = [];
        var value;
        for (var key in map) {
            value = map[key];
            key = encodeURIComponent(key);
            if (typeof value === 'boolean') {
                value && query.push(key);
            }
            else if (Array.isArray(value)) {
                for (var i = 0, j = value.length; i < j; ++i) {
                    query.push(key + '=' + encodeURIComponent(value[i]));
                }
            }
            else {
                query.push(key + '=' + encodeURIComponent(value));
            }
        }
        return query.join('&');
    }
    exports.objectToQuery = objectToQuery;
});
//# sourceMappingURL=_debug/io-query.js.map