(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    var nextId = 0;
    function advise(dispatcher, type, advice, receiveArguments) {
        var previous = dispatcher[type];
        var advised = {
            id: nextId++,
            advice: advice,
            receiveArguments: receiveArguments
        };
        if (previous) {
            if (type === 'after') {
                while (previous.next && (previous = previous.next)) { }
                previous.next = advised;
                advised.previous = previous;
            }
            else {
                dispatcher.before = advised;
                advised.next = previous;
                previous.previous = advised;
            }
        }
        else {
            dispatcher[type] = advised;
        }
        advice = previous = null;
        return {
            remove: function () {
                this.remove = noop;
                var previous = advised.previous;
                var next = advised.next;
                if (!previous && !next) {
                    dispatcher[type] = null;
                }
                else {
                    if (previous) {
                        previous.next = next;
                    }
                    else {
                        dispatcher[type] = next;
                    }
                    if (next) {
                        next.previous = previous;
                    }
                }
                dispatcher = advised = null;
            }
        };
    }
    function getDispatcher(target, methodName) {
        var existing = target[methodName];
        var dispatcher;
        if (!existing || existing.target !== target) {
            target[methodName] = dispatcher = function () {
                var executionId = nextId;
                var args = arguments;
                var results;
                var before = dispatcher.before;
                while (before) {
                    args = before.advice.apply(this, args) || args;
                    before = before.next;
                }
                if (dispatcher.around) {
                    results = dispatcher.around.advice(this, args);
                }
                var after = dispatcher.after;
                while (after && after.id < executionId) {
                    if (after.receiveArguments) {
                        var newResults = after.advice.apply(this, args);
                        results = newResults === undefined ? results : newResults;
                    }
                    else {
                        results = after.advice.call(this, results, args);
                    }
                    after = after.next;
                }
                return results;
            };
            if (existing) {
                dispatcher.around = {
                    advice: function (target, args) {
                        return existing.apply(target, args);
                    }
                };
            }
            dispatcher.target = target;
        }
        else {
            dispatcher = existing;
        }
        target = null;
        return dispatcher;
    }
    function noop() { }
    function after(target, methodName, advice) {
        return advise(getDispatcher(target, methodName), 'after', advice);
    }
    exports.after = after;
    function around(target, methodName, advice) {
        var dispatcher = getDispatcher(target, methodName);
        var previous = dispatcher.around;
        var advised = advice(function () {
            return previous.advice(this, arguments);
        });
        dispatcher.around = {
            advice: function (target, args) {
                return advised ?
                    advised.apply(target, args) :
                    previous.advice(target, args);
            }
        };
        advice = null;
        return {
            remove: function () {
                this.remove = noop;
                advised = dispatcher = null;
            }
        };
    }
    exports.around = around;
    function before(target, methodName, advice) {
        return advise(getDispatcher(target, methodName), 'before', advice);
    }
    exports.before = before;
    function on(target, methodName, advice) {
        return advise(getDispatcher(target, methodName), 'after', advice, true);
    }
    exports.on = on;
});
//# sourceMappingURL=_debug/aspect.js.map