(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './Evented'], function (require, exports) {
    var Evented = require('./Evented');
    var hub = new Evented();
    function subscribe(topic, listener) {
        return hub.on.apply(hub, arguments);
    }
    exports.subscribe = subscribe;
    function publish(topic) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        hub.emit.apply(hub, arguments);
    }
    exports.publish = publish;
});
//# sourceMappingURL=_debug/topic.js.map