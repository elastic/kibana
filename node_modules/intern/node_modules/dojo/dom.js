(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    function get(id, doc) {
        if (typeof id !== 'string') {
            return id;
        }
        return (doc || document).getElementById(id);
    }
    exports.get = get;
});
//# sourceMappingURL=_debug/dom.js.map