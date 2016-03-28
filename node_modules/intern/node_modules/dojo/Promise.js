(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './nextTick'], function (require, exports) {
    var nextTick = require('./nextTick');
    function isPromise(value) {
        return value && typeof value.then === 'function';
    }
    function runCallbacks(callbacks) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        for (var i = 0, callback; callback = callbacks[i]; ++i) {
            callback.apply(null, args);
        }
    }
    var Promise = (function () {
        function Promise(initializer) {
            var state = Promise.State.PENDING;
            Object.defineProperty(this, 'state', {
                get: function () {
                    return state;
                }
            });
            function isResolved() {
                return state !== Promise.State.PENDING || isChained;
            }
            var isChained = false;
            var resolvedValue;
            var callbacks = [];
            var whenFinished = function (callback) {
                callbacks.push(callback);
            };
            var progressCallbacks = [];
            var whenProgress = function (callback) {
                progressCallbacks.push(callback);
            };
            var canceler;
            var enqueue = (function () {
                function originalSchedule() {
                    schedule = function () { };
                    nextTick(function run() {
                        try {
                            var callback;
                            while ((callback = queue.shift())) {
                                callback();
                            }
                        }
                        finally {
                            if (queue.length) {
                                run();
                            }
                            else {
                                schedule = originalSchedule;
                            }
                        }
                    });
                }
                var queue = [];
                var schedule = originalSchedule;
                return function (callback) {
                    queue.push(callback);
                    schedule();
                };
            })();
            var resolve = function (newState, value) {
                if (isResolved()) {
                    return;
                }
                if (isPromise(value)) {
                    if (value === this) {
                        settle(Promise.State.REJECTED, new TypeError('Cannot chain a promise to itself'));
                        return;
                    }
                    try {
                        value.then(settle.bind(null, Promise.State.FULFILLED), settle.bind(null, Promise.State.REJECTED));
                        isChained = true;
                        canceler = value.cancel;
                    }
                    catch (error) {
                        settle(Promise.State.REJECTED, error);
                        return;
                    }
                }
                else {
                    settle(newState, value);
                }
            }.bind(this);
            function settle(newState, value) {
                if (state !== Promise.State.PENDING) {
                    return;
                }
                state = newState;
                resolvedValue = value;
                whenFinished = enqueue;
                whenProgress = function () { };
                enqueue(function () {
                    runCallbacks(callbacks);
                    callbacks = progressCallbacks = null;
                });
            }
            this.cancel = function (reason) {
                if (state !== Promise.State.PENDING) {
                    return;
                }
                if (!reason) {
                    reason = new Error('Cancelled');
                    reason.name = 'CancelError';
                }
                if (!canceler) {
                    settle(Promise.State.REJECTED, reason);
                    return Promise.reject(reason);
                }
                try {
                    resolve(Promise.State.FULFILLED, canceler(reason));
                }
                catch (error) {
                    settle(Promise.State.REJECTED, error);
                    return Promise.reject(error);
                }
            };
            this.then = function (onFulfilled, onRejected, onProgress) {
                return new Promise(function (resolve, reject, progress, setCanceler) {
                    setCanceler(function (reason) {
                        if (canceler) {
                            resolve(canceler(reason));
                        }
                        else {
                            throw reason;
                        }
                    });
                    whenProgress(function (data) {
                        try {
                            if (typeof onProgress === 'function') {
                                progress(onProgress(data));
                            }
                            else {
                                progress(data);
                            }
                        }
                        catch (error) {
                            if (error.name !== 'StopProgressPropagation') {
                                throw error;
                            }
                        }
                    });
                    whenFinished(function () {
                        var callback = state === Promise.State.REJECTED ? onRejected : onFulfilled;
                        if (typeof callback === 'function') {
                            try {
                                resolve(callback(resolvedValue));
                            }
                            catch (error) {
                                reject(error);
                            }
                        }
                        else if (state === Promise.State.REJECTED) {
                            reject(resolvedValue);
                        }
                        else {
                            resolve(resolvedValue);
                        }
                    });
                });
            };
            try {
                initializer(resolve.bind(null, Promise.State.FULFILLED), resolve.bind(null, Promise.State.REJECTED), function (data) {
                    if (state === Promise.State.PENDING) {
                        enqueue(runCallbacks.bind(null, progressCallbacks, data));
                    }
                }, function (value) {
                    if (!isResolved()) {
                        canceler = value;
                    }
                });
            }
            catch (error) {
                settle(Promise.State.REJECTED, error);
            }
        }
        Promise.all = function (iterable) {
            return new this(function (resolve, reject, progress, setCanceler) {
                setCanceler(function (reason) {
                    walkIterable(function (key, value) {
                        if (value && value.cancel) {
                            value.cancel(reason);
                        }
                    });
                    throw reason;
                });
                function fulfill(key, value) {
                    values[key] = value;
                    progress(values);
                    ++complete;
                    finish();
                }
                function finish() {
                    if (populating || complete < total) {
                        return;
                    }
                    resolve(values);
                }
                function processItem(key, value) {
                    ++total;
                    if (isPromise(value)) {
                        value.then(fulfill.bind(null, key), reject);
                    }
                    else {
                        fulfill(key, value);
                    }
                }
                function walkIterable(callback) {
                    if (Array.isArray(iterable)) {
                        for (var i = 0, j = iterable.length; i < j; ++i) {
                            if (i in iterable) {
                                callback(String(i), iterable[i]);
                            }
                        }
                    }
                    else {
                        for (var key in iterable) {
                            callback(key, iterable[key]);
                        }
                    }
                }
                var values = Array.isArray(iterable) ? [] : {};
                var complete = 0;
                var total = 0;
                var populating = true;
                walkIterable(processItem);
                populating = false;
                finish();
            });
        };
        Promise.reject = function (error) {
            return new this(function (resolve, reject) {
                reject(error);
            });
        };
        Promise.resolve = function (value) {
            if (value instanceof Promise) {
                return value;
            }
            return new this(function (resolve) {
                resolve(value);
            });
        };
        Promise.prototype.catch = function (onRejected) {
            return this.then(null, onRejected);
        };
        Promise.prototype.finally = function (onFulfilledOrRejected) {
            function getFinalValue(defaultCallback) {
                var returnValue = onFulfilledOrRejected();
                if (returnValue === undefined) {
                    return defaultCallback();
                }
                else if (returnValue && returnValue.then) {
                    return returnValue.then(function (returnValue) {
                        return returnValue !== undefined ? returnValue : defaultCallback();
                    });
                }
                else {
                    return returnValue;
                }
            }
            return this.then(function (value) {
                return getFinalValue(function () {
                    return value;
                });
            }, function (error) {
                return getFinalValue(function () {
                    throw error;
                });
            });
        };
        Promise.prototype.progress = function (onProgress) {
            return this.then(null, null, onProgress);
        };
        return Promise;
    })();
    var Promise;
    (function (Promise) {
        var Deferred = (function () {
            function Deferred(canceler) {
                var _this = this;
                this.promise = new Promise(function (resolve, reject, progress, setCanceler) {
                    _this.progress = progress;
                    _this.reject = reject;
                    _this.resolve = resolve;
                    canceler && setCanceler(canceler);
                });
            }
            return Deferred;
        })();
        Promise.Deferred = Deferred;
        (function (State) {
            State[State["PENDING"] = 0] = "PENDING";
            State[State["FULFILLED"] = 1] = "FULFILLED";
            State[State["REJECTED"] = 2] = "REJECTED";
        })(Promise.State || (Promise.State = {}));
        var State = Promise.State;
    })(Promise || (Promise = {}));
    return Promise;
});
//# sourceMappingURL=_debug/Promise.js.map