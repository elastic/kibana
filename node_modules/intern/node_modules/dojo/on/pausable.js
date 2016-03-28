(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", '../on'], function (require, exports) {
    var on = require('../on');
    function pausable(type) {
        return function (target, listener, capture) {
            var paused;
            var handle = on(target, type, function () {
                if (!paused) {
                    listener.apply(this, arguments);
                }
            }, capture);
            handle.pause = function () {
                paused = true;
            };
            handle.resume = function () {
                paused = false;
            };
            return handle;
        };
    }
    return pausable;
});
//# sourceMappingURL=../_debug/on/pausable.js.map