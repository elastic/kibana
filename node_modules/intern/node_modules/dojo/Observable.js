(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './lang', './Scheduler'], function (require, exports) {
    var lang = require('./lang');
    var Scheduler = require('./Scheduler');
    var Observable = (function () {
        function Observable(props) {
            if (props) {
                lang.mixin(this, props);
            }
            Object.defineProperties(this, {
                _callbacks: {
                    value: {}
                },
                _dispatch: {
                    configurable: true,
                    value: this._dispatch.bind(this),
                    writable: true
                },
                _notifications: {
                    value: Object.create(null),
                    writable: true
                },
                _timer: {
                    value: null,
                    writable: true
                }
            });
        }
        Observable.prototype._dispatch = function () {
            if (this._timer) {
                this._timer.remove();
                this._timer = null;
            }
            var notifications = this._notifications;
            this._notifications = Object.create(null);
            for (var property in notifications) {
                var notification = notifications[property];
                if (this._isEqual(notification.oldValue, notification.newValue)) {
                    continue;
                }
                var callback;
                for (var i = 0; (callback = notification.callbacks[i]); i++) {
                    if (!callback.removed) {
                        callback.callback.call(this, notification.newValue, notification.oldValue);
                    }
                }
            }
        };
        Observable.prototype._isEqual = function (a, b) {
            return lang.isEqual(a, b);
        };
        Observable.prototype._notify = function (property, newValue, oldValue) {
            var callbacks = this._callbacks[property];
            if (!callbacks || !callbacks.length) {
                return;
            }
            var notification = this._notifications[property];
            if (notification) {
                notification.newValue = newValue;
            }
            else {
                this._notifications[property] = {
                    newValue: newValue,
                    oldValue: oldValue,
                    callbacks: callbacks.slice(0)
                };
            }
            this._schedule();
        };
        Observable.prototype.observe = function (property, callback) {
            var callbackObject = {
                callback: callback
            };
            if (!this._callbacks[property]) {
                var oldDescriptor = lang.getPropertyDescriptor(this, property), currentValue = this[property], descriptor = {
                    configurable: true,
                    enumerable: true
                };
                if (oldDescriptor && !('value' in oldDescriptor)) {
                    descriptor.get = oldDescriptor.get;
                    if (oldDescriptor.set) {
                        descriptor.set = function (value) {
                            oldDescriptor.set.apply(this, arguments);
                            var newValue = descriptor.get.call(this);
                            this._notify(property, newValue, currentValue);
                            currentValue = newValue;
                        };
                    }
                }
                else {
                    descriptor.get = function () {
                        return currentValue;
                    };
                    if (oldDescriptor.writable) {
                        descriptor.set = function (newValue) {
                            this._notify(property, newValue, currentValue);
                            currentValue = newValue;
                        };
                    }
                }
                Object.defineProperty(this, property, descriptor);
                this._callbacks[property] = [callbackObject];
            }
            else {
                this._callbacks[property].push(callbackObject);
            }
            var self = this;
            return {
                remove: function () {
                    this.remove = function () { };
                    callbackObject.removed = true;
                    lang.pullFromArray(self._callbacks[property], callbackObject);
                }
            };
        };
        Observable.prototype._schedule = function () {
            if (!this._timer) {
                this._timer = Scheduler.schedule(this._dispatch);
            }
        };
        return Observable;
    })();
    return Observable;
});
//# sourceMappingURL=_debug/Observable.js.map