(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './on', './aspect'], function (require, exports) {
    var on = require('./on');
    var aspect = require('./aspect');
    var Evented = (function () {
        function Evented() {
        }
        Evented.prototype.on = function (type, listener) {
            var _this = this;
            return on.parse(this, type, listener, this, function (target, type) {
                var name = '__on' + type;
                if (!_this[name]) {
                    Object.defineProperty(_this, name, {
                        configurable: true,
                        value: undefined,
                        writable: true
                    });
                }
                return aspect.on(_this, '__on' + type, listener);
            });
        };
        Evented.prototype.emit = function (type) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            type = '__on' + type;
            var method = this[type];
            if (method) {
                return method.apply(this, args);
            }
        };
        return Evented;
    })();
    return Evented;
});
//# sourceMappingURL=_debug/Evented.js.map