(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './CallbackQueue', './nextTick'], function (require, exports) {
    var CallbackQueue = require('./CallbackQueue');
    var nextTick = require('./nextTick');
    var Scheduler = (function () {
        function Scheduler() {
            this._callbacks = new CallbackQueue();
        }
        Scheduler.schedule = function (callback) {
            return scheduler.schedule(callback);
        };
        Scheduler.prototype.schedule = function (callback) {
            var _this = this;
            var handle = this._callbacks.add(callback);
            nextTick(function () {
                _this._callbacks.drain();
            });
            return handle;
        };
        return Scheduler;
    })();
    var scheduler = new Scheduler();
    return Scheduler;
});
//# sourceMappingURL=_debug/Scheduler.js.map