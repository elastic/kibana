(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    var CallbackQueue = (function () {
        function CallbackQueue() {
            this._callbacks = [];
        }
        CallbackQueue.prototype.add = function (callback) {
            var _callback = {
                active: true,
                callback: callback
            };
            this._callbacks.push(_callback);
            callback = null;
            return {
                remove: function () {
                    this.remove = function () { };
                    _callback.active = false;
                    _callback = null;
                }
            };
        };
        CallbackQueue.prototype.drain = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var callbacks = this._callbacks;
            var item;
            this._callbacks = [];
            for (var i = 0; i < callbacks.length; i++) {
                item = callbacks[i];
                if (item && item.active) {
                    item.callback.apply(null, args);
                }
            }
        };
        return CallbackQueue;
    })();
    return CallbackQueue;
});
//# sourceMappingURL=_debug/CallbackQueue.js.map