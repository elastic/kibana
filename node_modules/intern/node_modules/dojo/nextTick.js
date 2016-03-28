(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './CallbackQueue', './has'], function (require, exports) {
    var CallbackQueue = require('./CallbackQueue');
    var has = require('./has');
    has.add('dom-mutationobserver', function (global) {
        return has('host-browser') && Boolean(global.MutationObserver || global.WebKitMutationObserver);
    });
    function noop() { }
    var nextTick;
    if (typeof setImmediate !== 'undefined' &&
        (!has('host-node') || (has('host-node') && process.version.indexOf('v0.10.') === 0))) {
        nextTick = function (callback) {
            var timer = setImmediate(callback);
            return {
                remove: function () {
                    this.remove = noop;
                    clearImmediate(timer);
                }
            };
        };
    }
    else if (has('host-node')) {
        nextTick = function (callback) {
            var removed = false;
            process.nextTick(function () {
                if (removed) {
                    return;
                }
                callback();
            });
            return {
                remove: function () {
                    this.remove = noop;
                    removed = true;
                }
            };
        };
    }
    else {
        var queue = new CallbackQueue();
        if (has('dom-mutationobserver')) {
            nextTick = (function () {
                var MutationObserver = this.MutationObserver || this.WebKitMutationObserver;
                var element = document.createElement('div');
                var observer = new MutationObserver(function () {
                    queue.drain();
                });
                observer.observe(element, { attributes: true });
                return function (callback) {
                    var handle = queue.add(callback);
                    element.setAttribute('drainQueue', '1');
                    return handle;
                };
            })();
        }
        else {
            nextTick = (function () {
                var timer;
                return function (callback) {
                    var handle = queue.add(callback);
                    if (!timer) {
                        timer = setTimeout(function () {
                            clearTimeout(timer);
                            timer = null;
                            queue.drain();
                        }, 0);
                    }
                    return handle;
                };
            })();
        }
    }
    return nextTick;
});
//# sourceMappingURL=_debug/nextTick.js.map