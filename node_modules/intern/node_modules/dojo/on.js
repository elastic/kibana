(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    function noop() { }
    function addListener(target, type, listener, capture) {
        if (target.addEventListener) {
            target.addEventListener(type, listener, capture);
            return {
                remove: function () {
                    this.remove = noop;
                    target.removeEventListener(type, listener, capture);
                    target = listener = null;
                }
            };
        }
        throw new Error('Target must be an event emitter');
    }
    var on = function (target, type, listener, capture) {
        if (typeof target.on === 'function' && typeof type !== 'function' && !target.nodeType) {
            return target.on(type, listener, capture);
        }
        return on.parse(target, type, listener, this, addListener, capture);
    };
    on.parse = function (target, type, listener, context, addListener, capture) {
        if (type.call) {
            return type.call(context, target, listener, capture);
        }
        if (type.indexOf(',') > -1) {
            var events = type.split(/\s*,\s*/);
            var handles = events.map(function (type) {
                return addListener(target, type, listener, capture);
            });
            return {
                remove: function () {
                    this.remove = noop;
                    var handle;
                    while ((handle = handles.pop())) {
                        handle.remove();
                    }
                }
            };
        }
        return addListener(target, type, listener, capture);
    };
    on.emit = function (target, type, event) {
        if (typeof target.emit === 'function' && !target.nodeType) {
            return target.emit(type, event);
        }
        if (target.dispatchEvent && target.ownerDocument && target.ownerDocument.createEvent) {
            var nativeEvent = target.ownerDocument.createEvent('HTMLEvents');
            nativeEvent.initEvent(type, Boolean(event.bubbles), Boolean(event.cancelable));
            for (var key in event) {
                if (!(key in nativeEvent)) {
                    nativeEvent[key] = event[key];
                }
            }
            return target.dispatchEvent(nativeEvent);
        }
        throw new Error('Target must be an event emitter');
    };
    return on;
});
//# sourceMappingURL=_debug/on.js.map