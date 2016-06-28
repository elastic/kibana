(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", '../on'], function (require, exports) {
    var on = require('../on');
    function once(type) {
        return function (target, listener, capture) {
            var handle = on(target, type, function () {
                handle.remove();
                listener.apply(this, arguments);
            });
            return handle;
        };
    }
    ;
    return once;
});
//# sourceMappingURL=../_debug/on/once.js.map