"use strict";
module.exports = function(Promise, INTERNAL, cast) {
var ASSERT = require("./assert.js");
var canAttach = require("./errors.js").canAttach;
var util = require("./util.js");
var isArray = util.isArray;

//To avoid eagerly allocating the objects
//and also because void 0 cannot be smuggled
function toResolutionValue(val) {
    switch(val) {
    case RESOLVE_UNDEFINED: return void 0;
    case RESOLVE_ARRAY: return [];
    case RESOLVE_OBJECT: return {};
    }
    ASSERT(false);
}

function PromiseArray(values) {
    ASSERT(arguments.length === 1);
    var promise = this._promise = new Promise(INTERNAL);
    var parent = void 0;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, PROPAGATE_CANCEL | PROPAGATE_BIND);
    }
    promise._setTrace(parent);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(void 0, RESOLVE_ARRAY);
}
PromiseArray.prototype.length = function PromiseArray$length() {
    return this._length;
};

PromiseArray.prototype.promise = function PromiseArray$promise() {
    return this._promise;
};

PromiseArray.prototype._init =
            //when.some resolves to [] when empty
            //but when.any resolved to void 0 when empty :<
function PromiseArray$_init(_, resolveValueIfEmpty) {
            //_ must be intentionally empty because smuggled
            //data is always the second argument
            //all of this is due to when vs some having different semantics on
            //empty arrays
    var values = cast(this._values, void 0);
    if (values instanceof Promise) {
        this._values = values;
        values._setBoundTo(this._promise._boundTo);
        //Expect the promise to be a promise
        //for an array
        if (values.isFulfilled()) {
            //Fulfilled promise with hopefully
            //an array as a resolution value
            values = values._settledValue;
            if (!isArray(values)) {
                var err = new Promise.TypeError(COLLECTION_ERROR);
                this.__hardReject__(err);
                return;
            }
        } else if (values.isPending()) {
            ASSERT(typeof resolveValueIfEmpty === "number");
            ASSERT(resolveValueIfEmpty < 0);
            values._then(
                PromiseArray$_init,
                this._reject,
                void 0,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            values._unsetRejectionIsUnhandled();
            this._reject(values._settledValue);
            return;
        }
    } else if (!isArray(values)) {
        var err = new Promise.TypeError(COLLECTION_ERROR);
        this.__hardReject__(err);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === RESOLVE_CALL_METHOD) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    var newLen = len;
    var newValues = this.shouldCopyValues() ? new Array(len) : this._values;
    var isDirectScanNeeded = false;
    for (var i = 0; i < len; ++i) {
        var maybePromise = cast(values[i], void 0);
        if (maybePromise instanceof Promise) {
            if (maybePromise.isPending()) {
                //Optimized for just passing the updates through
                maybePromise._proxyPromiseArray(this, i);
            } else {
                maybePromise._unsetRejectionIsUnhandled();
                isDirectScanNeeded = true;
            }
        } else {
            isDirectScanNeeded = true;
        }
        newValues[i] = maybePromise;
    }
    this._values = newValues;
    this._length = newLen;
    if (isDirectScanNeeded) {
        this._scanDirectValues(len);
    }
};

PromiseArray.prototype._settlePromiseAt =
function PromiseArray$_settlePromiseAt(index) {
    var value = this._values[index];
    if (!(value instanceof Promise)) {
        this._promiseFulfilled(value, index);
    } else if (value.isFulfilled()) {
        this._promiseFulfilled(value._settledValue, index);
    } else if (value.isRejected()) {
        this._promiseRejected(value._settledValue, index);
    }
};

PromiseArray.prototype._scanDirectValues =
function PromiseArray$_scanDirectValues(len) {
    ASSERT(len >= this.length());
    for (var i = 0; i < len; ++i) {
        if (this._isResolved()) {
            break;
        }
        this._settlePromiseAt(i);
    }
};

PromiseArray.prototype._isResolved = function PromiseArray$_isResolved() {
    return this._values === null;
};

PromiseArray.prototype._resolve = function PromiseArray$_resolve(value) {
    ASSERT(!this._isResolved());
    ASSERT(!(value instanceof Promise));
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function PromiseArray$_reject(reason) {
    ASSERT(!this._isResolved());
    this._values = null;
    var trace = canAttach(reason) ? reason : new Error(reason + "");
    this._promise._attachExtraTrace(trace);
    this._promise._reject(reason, trace);
};

PromiseArray.prototype._promiseProgressed =
function PromiseArray$_promiseProgressed(progressValue, index) {
    if (this._isResolved()) return;
    ASSERT(isArray(this._values));
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled =
function PromiseArray$_promiseFulfilled(value, index) {
    if (this._isResolved()) return;
    ASSERT(isArray(this._values));
    ASSERT(typeof index === "number");
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected =
function PromiseArray$_promiseRejected(reason, index) {
    ASSERT(index >= 0);
    if (this._isResolved()) return;
    ASSERT(isArray(this._values));
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues =
function PromiseArray$_shouldCopyValues() {
    return true;
};

PromiseArray.prototype.getActualLength =
function PromiseArray$getActualLength(len) {
    return len;
};

return PromiseArray;
};
