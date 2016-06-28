(function( global ) {

  'use strict';

  var $$iterator, ArrayIteratorPrototype;

  // don't trample native promises if they exist
  if ( 'Promise' in global && typeof global.Promise.all === 'function' ) {
    return;
  }

  // set a value as non-configurable and non-enumerable
  function defineInternal ( obj, key, val ) {
    Object.defineProperty(obj, key, {
      configurable: false,
      enumerable: false,
      writable: true,
      value: val
    });
  }

  // From the ES6 spec (http://people.mozilla.org/~jorendorff/es6-draft.html)

  // 6 ECMAScript Data Types and Values
  function Type ( x ) {
    switch ( typeof x ) {
      case 'undefined':
      case 'boolean':
      case 'string':
      case 'number':
        return typeof x;
      default:
        if ( x === null ) {
          return 'null';
        }
        if ( typeof Symbol === 'function' && x instanceof Symbol ) {
          return 'symbol';
        }
        return 'object';
    }
  }

  // 6.1.5.1 Well-Known Symbols (iterator key)
  $$iterator = typeof Symbol !== 'undefined' && Symbol.iterator ||
    '_shim_iterator_';

  // 7.1.4 ToInteger
  function ToInteger ( argument ) {
    var number = +argument;
    if ( number !== number ) {
      return 0;
    }
    if ( number === 0 || number === Infinity || number === -Infinity ) {
      return number;
    }
    return ( number >= 0 ? 1 : -1 ) * Math.floor(Math.abs(number));
  }

  // 7.1.12 ToString
  function ToString ( argument ) {
    return typeof argument === 'string' ? argument : String(argument);
  }

  // 7.1.13 ToObject
  function ToObject ( argument ) {
    if ( argument == null ) {
      throw TypeError();
    }
    switch ( typeof argument ) {
      case 'boolean':
      case 'number':
      case 'string':
        return Object(argument);
      default:
        return argument;
    }
  }

  // 7.1.15 ToLength
  function ToLength ( argument ) {
    var len = ToInteger(argument);
    return len <= 0 ? 0 : Math.min(len, Math.pow(2, 53) - 1);
  }

  // 7.2.2 IsCallable
  function IsCallable ( argument ) {
    return typeof argument === 'function';
  }

  // 7.2.3 SameValue( x, y )
  function SameValue ( x, y ) {
    if ( typeof x !== typeof y ) {
      return false;
    }
    if ( Type(x) === 'undefined' ) {
      return true;
    }
    if ( Type(x) === 'number' ) {
      if ( x !== x && y !== y ) {
        return true;
      }
      if ( x === 0 ) {
        return 1 / x === 1 / y;
      }
    }
    return x === y;
  }

  // 7.2.5 IsConstructor
  // this is an ES6 abstract operation, and it's not really
  // possible in JS, but this should be good enough
  function IsConstructor ( obj ) {
    return typeof obj === 'function';
  }

  // 7.4.1 GetIterator ( obj )
  // not a real shim, but it works
  function GetIterator ( obj ) {
    var iterator = obj[$$iterator]();
    if ( Type(obj) !== 'object' ) {
      throw TypeError();
    }
    return iterator;
  }

  // 7.4.2 IteratorNext ( iterator, value )
  function IteratorNext ( iterator, value ) {
    var result = iterator.next(value);
    if ( Type(result) !== 'object' ) {
      throw TypeError();
    }
    return result;
  }

  // 7.4.3 IteratorComplete ( iterResult )
  function IteratorComplete ( iterResult ) {
    if ( Type(iterResult) !== 'object' ) {
      throw TypeError();
    }
    return Boolean(iterResult.done);
  }

  // 7.4.4 IteratorValue ( iterResult )
  function IteratorValue ( iterResult ) {
    if ( Type(iterResult) !== 'object' ) {
      throw TypeError();
    }
    return iterResult.value;
  }

  // 7.4.5 IteratorStep ( iterator )
  function IteratorStep ( iterator ) {
    var result = IteratorNext(iterator);
    return IteratorComplete(result) === true ? false : result;
  }

  // 7.4.6 CreateIterResultObject ( value, done )
  function CreateIterResultObject ( value, done ) {
    if ( Type(done) !== 'boolean' ) {
      throw TypeError();
    }
    return {value: value, done: done};
  }

  // 8.4.1 EnqueueTask ( queueName, task, arguments)
  // not a real shim, but good enough
  function EnqueueTask ( task, args ) {
    if ( typeof setImmediate === 'function' ) {
      setImmediate(function() {
        task.apply(null, args);
      });
    } else {
      setTimeout(function() {
        task.apply(null, args);
      }, 0);
    }
  }

  // 22.1.5.1 CreateArrayIterator Abstract Operation
  function CreateArrayIterator ( array, kind ) {
    var O = ToObject(array),
      iterator = Object.create(ArrayIteratorPrototype);
    defineInternal(iterator, '[[IteratedObject]]', O);
    defineInternal(iterator, '[[ArrayIteratorNextIndex]]', 0);
    defineInternal(iterator, '[[ArrayIteratorKind]]', kind);
    return iterator;
  }

  // 22.1.3.29 Array.prototype.values ( )
  defineInternal( Array.prototype, 'values', function () {
    var O = ToObject(this);
    return CreateArrayIterator(O, 'value');
  });

  // 22.1.3.30 Array.prototype [ @@iterator ] ( )
  defineInternal( Array.prototype, $$iterator, Array.prototype.values );

  // 22.1.5.2 The %ArrayIteratorPrototype% Object
  ArrayIteratorPrototype = {};

  // 22.1.5.2.1 %ArrayIteratorPrototype%. next()
  ArrayIteratorPrototype.next = function () {
    var O = this, a, index, itemKind, lenValue, len,
      elementKey, elementValue, result;
    if ( Type(O) !== 'object' ) {
      throw TypeError();
    }
    a = O['[[IteratedObject]]'];
    if ( Type(a) === 'undefined' ) {
      return CreateIterResultObject(undefined, true);
    }
    index = O['[[ArrayIteratorNextIndex]]'];
    itemKind = O['[[ArrayIteratorKind]]'];
    lenValue = a.length;
    len = ToLength(lenValue);
    if ( index >= len ) {
      defineInternal(O, '[[IteratedObject]]', undefined);
      return CreateIterResultObject(undefined, true);
    }
    defineInternal(O, '[[ArrayIteratorNextIndex]]', index + 1);
    if ( itemKind.indexOf('value') !== -1 ) {
      elementKey = ToString(index);
      elementValue = a[elementKey];
    }
    if ( itemKind.indexOf('key+value') !== -1 ) {
      result = [index, elementValue];
      return CreateIterResultObject(result, false);
    } else if ( itemKind.indexOf('key') !== -1 ) {
      return CreateIterResultObject(index, false);
    }
    if ( itemKind.indexOf('value') === -1 ) {
      throw TypeError();
    }
    return CreateIterResultObject(elementValue, false);
  };

  // 22.1.5.2.2 %ArrayIteratorPrototype% [ @@iterator ] ( )
  ArrayIteratorPrototype[$$iterator] = function () {
    return this;
  };

  // 25.4.1.1.1 IfAbruptRejectPromise (value, capability)
  function IfAbruptRejectPromise ( value, capability ) {
    try {
      capability['[[Reject]]'].call(undefined, [value]);
    } catch ( e ) {
      return e;
    }
    return capability;
  }

  // 25.4.1.3 CreateRejectFunction ( promise )
  function CreateRejectFunction ( promise ) {
    var reject = new PromiseReject();
    defineInternal(reject, '[[Promise]]', promise);
    return reject;
  }

  // 25.4.1.3.1 Promise Reject Functions
  function PromiseReject () {
    return function F ( reason ) {
      var promise = F['[[Promise]]'], reactions;
      if ( Type(promise) !== 'object' ) {
        throw TypeError();
      }
      if ( promise['[[PromiseStatus]]'] !== 'unresolved' ) {
        return undefined;
      }
      reactions = promise['[[PromiseRejectReactions]]'];
      defineInternal(promise, '[[PromiseResult]]', reason);
      defineInternal(promise, '[[PromiseResolveReactions]]', undefined);
      defineInternal(promise, '[[PromiseRejectReactions]]', undefined);
      defineInternal(promise, '[[PromiseStatus]]', 'has-rejection');
      return TriggerPromiseReactions(reactions, reason);
    };
  }

  // 25.4.1.4 CreateRejectFunction ( promise )
  function CreateResolveFunction ( promise ) {
    var resolve = new PromiseResolve();
    defineInternal(resolve, '[[Promise]]', promise);
    return resolve;
  }

  // 25.4.1.4.1 Promise Resolve Functions
  function PromiseResolve () {
    return function F ( resolution ) {
      var promise = F['[[Promise]]'], reactions;
      if ( Type(promise) !== 'object' ) {
        throw TypeError();
      }
      if ( promise['[[PromiseStatus]]'] !== 'unresolved' ) {
        return undefined;
      }
      reactions = promise['[[PromiseResolveReactions]]'];
      defineInternal(promise, '[[PromiseResult]]', resolution);
      defineInternal(promise, '[[PromiseResolveReactions]]', undefined);
      defineInternal(promise, '[[PromiseRejectReactions]]', undefined);
      defineInternal(promise, '[[PromiseStatus]]', 'has-resolution');
      return TriggerPromiseReactions(reactions, resolution);
    };
  }

  // 25.4.1.5 NewPromiseCapability ( C )
  function NewPromiseCapability ( C ) {
    var promise;
    if ( !IsConstructor(C) ) {
      throw TypeError();
    }
    try {
      promise = Object.create(C.prototype);
    } catch ( e ) {
      return e;
    }
    return CreatePromiseCapabilityRecord(promise, C);
  }

  // 25.4.1.5.1 CreatePromiseCapabilityRecord( promise, constructor )
  function CreatePromiseCapabilityRecord ( promise, constructor ) {
    var promiseCapability = {}, executor, constructorResult;
    defineInternal(promiseCapability, '[[Promise]]', promise);
    defineInternal(promiseCapability, '[[Resolve]]', undefined);
    defineInternal(promiseCapability, '[[Reject]]', undefined);
    executor = new GetCapabilitiesExecutor();
    defineInternal(executor, '[[Capability]]', promiseCapability);
    try {
      constructorResult = constructor.call(promise, executor);
    } catch ( e ) {
      return e;
    }
    if ( !IsCallable(promiseCapability['[[Resolve]]']) ) {
      throw TypeError();
    }
    if ( !IsCallable(promiseCapability['[[Reject]]']) ) {
      throw TypeError();
    }
    if ( typeof constructorResult === 'object' &&
      !SameValue(promise, constructorResult) ) {
      throw TypeError();
    }
    return promiseCapability;
  }

  // 25.4.1.5.2 GetCapabilitiesExecutor Functions
  function GetCapabilitiesExecutor () {
    return function F ( resolve, reject ) {
      var promiseCapability = F['[[Capability]]'];
      if ( Type(promiseCapability['[[Resolve]]']) !== 'undefined' ) {
        throw TypeError();
      }
      if ( Type(promiseCapability['[[Reject]]']) !== 'undefined' ) {
        throw TypeError();
      }
      defineInternal(promiseCapability, '[[Resolve]]', resolve);
      defineInternal(promiseCapability, '[[Reject]]', reject);
    };
  }

  // 25.4.1.6 IsPromise ( x )
  function IsPromise ( x ) {
    if ( Type(x) !== 'object' ) {
      return false;
    }
    if ( Type(x['[[PromiseStatus]]']) === 'undefined' ) {
      return false;
    }
    return true;
  }

  // 25.4.1.7 TriggerPromiseReactions ( reactions, argument )
  function TriggerPromiseReactions ( reactions, argument ) {
    reactions.forEach(function( reaction ) {
      EnqueueTask(PromiseReactionTask, [reaction, argument]);
    });
  }

  // 25.4.1.8 UpdatePromiseFromPotentialThenable ( x, promiseCapability )
  function UpdatePromiseFromPotentialThenable ( x, promiseCapability ) {
    var then, rejectResult, thenCallResult;
    if ( Type(x) !== 'object' ) {
      return 'not a thenable';
    }
    try {
      then = x.then;
    } catch ( e ) {
      rejectResult = promiseCapability['[[Reject]]'].call(undefined, e);
      return null;
    }
    if ( !IsCallable(then) ) {
      return 'not a thenable';
    }
    try {
      thenCallResult = then.call(x, promiseCapability['[[Resolve]]'],
        promiseCapability['[[Reject]]']
      );
    } catch ( e ) {
      rejectResult = promiseCapability['[[Reject]]'].call(undefined, e);
      return null;
    }
    return null;
  }

  // 25.4.2.1 PromiseReactionTask( reaction, argument )
  function PromiseReactionTask ( reaction, argument ) {
    var promiseCapability = reaction['[[Capabilities]]'],
      handler = reaction['[[Handler]]'],
      handlerResult, selfResolutionError, updateResult;
    try {
      handlerResult = handler.call(undefined, argument);
    } catch ( e ) {
      return promiseCapability['[[Reject]]'].call(undefined, e);
    }
    if ( SameValue(handlerResult, promiseCapability['[[Promise]]']) ) {
      selfResolutionError = TypeError();
      return promiseCapability['[[Reject]]']
        .call(undefined, selfResolutionError);
    }
    updateResult = UpdatePromiseFromPotentialThenable(handlerResult,
      promiseCapability
    );
    if ( updateResult === 'not a thenable' ) {
      return promiseCapability['[[Resolve]]'].call(undefined, handlerResult);
    }
    return undefined;
  }

  // 25.4.3.1 Promise ( executor )
  function Promise ( executor ) {
    var promise = this;
    if ( !IsCallable(executor) ) {
      throw TypeError('Invalid executor');
    }
    if ( Type(promise) !== 'object' ) {
      throw TypeError('Invalid promise');
    }
    if ( Type(promise['[[PromiseStatus]]']) !== 'undefined' ) {
      throw TypeError();
    }
    defineInternal(this, '[[PromiseConstructor]]', Promise);
    return InitializePromise(promise, executor);
  }

  // 25.4.3.1.1 InitializePromise( promise, executor )
  function InitializePromise ( promise, executor) {
    var resolve, reject, completion, status;
    if ( Type(promise['[[PromiseStatus]]']) !== 'undefined' ) {
      throw TypeError();
    }
    if ( !IsCallable(executor) ) {
      throw TypeError();
    }
    defineInternal(promise, '[[PromiseStatus]]', 'unresolved');
    defineInternal(promise, '[[PromiseResolveReactions]]', []);
    defineInternal(promise, '[[PromiseRejectReactions]]', []);
    resolve = CreateResolveFunction(promise);
    reject = CreateRejectFunction(promise);
    try {
      completion = executor.call(undefined, resolve, reject);
    } catch ( e ) {
      try {
        status = reject.call(undefined, e);
      } catch ( e ) {
        return e;
      }
    }
    return promise;
  }

  // 25.4.4.1 Promise.all ( iterable )
  Promise.all = function ( iterable ) {
    var C = this, promiseCapability, iterator, values,
      remainingElementsCount, index, next, resolveResult,
      nextValue, nextPromise, resolveElement, result;
    try {
      promiseCapability = NewPromiseCapability(C);
    } catch ( e ) {
      return e;
    }
    try {
      iterator = GetIterator(iterable);
    } catch ( e ) {
      return IfAbruptRejectPromise(e, promiseCapability);
    }
    values = [];
    remainingElementsCount = {'[[value]]': 0};
    index = 0;
    while ( true ) {
      try {
        next = IteratorStep(iterator);
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      if ( next === false ) {
        if ( index === 0 ) {
          try {
            resolveResult = promiseCapability['[[Resolve]]']
              .call(undefined, values);
          } catch ( e ) {
            return e;
          }
        }
        return promiseCapability['[[Promise]]'];
      }
      try {
        nextValue = IteratorValue(next);
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      try {
        nextPromise = C.cast(nextValue);
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      resolveElement = new PromiseAllResolveElementFunction();
      defineInternal(resolveElement, '[[Index]]', index);
      defineInternal(resolveElement, '[[Values]]', values);
      defineInternal(resolveElement, '[[Capabilities]]', promiseCapability);
      defineInternal(resolveElement, '[[RemainingElements]]',
        remainingElementsCount
      );
      try {
        result = nextPromise.then(resolveElement,
          promiseCapability['[[Reject]]']
        );
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      index++;
      remainingElementsCount['[[value]]']++;
    }
  };

  // 25.4.4.1.1 Promise.all Resolve Element Functions
  function PromiseAllResolveElementFunction () {
    return function F ( x ) {
      var index = F['[[Index]]'],
        values = F['[[Values]]'],
        promiseCapability = F['[[Capabilities]]'],
        remainingElementsCount = F['[[RemainingElements]]'];
      try {
        values[index] = x;
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      remainingElementsCount['[[value]]']--;
      if ( remainingElementsCount['[[value]]'] === 0 ) {
        promiseCapability['[[Resolve]]'].call(undefined, values);
      }
      return undefined;
    };
  }

  // 25.4.4.2 Promise.cast ( x )
  Promise.cast = function ( x ) {
    var C = this,
      promiseCapability,
      resolveResult,
      constructor;
    if ( IsPromise(x) ) {
      constructor = x['[[PromiseConstructor]]'];
      if ( SameValue(constructor, C) ) {
        return x;
      }
    }
    try {
      promiseCapability = NewPromiseCapability(C);
    } catch ( e ) {
      return e;
    }
    try {
      resolveResult = promiseCapability['[[Resolve]]'].call(undefined, x);
    } catch ( e ) {
      return e;
    }
    return promiseCapability['[[Promise]]'];
  };

  // 25.4.4.4 Promise.race ( iterable )
  Promise.race = function ( iterable ) {
    var C = this, promiseCapability, iterator, nextValue, nextPromise, next;
    try {
      promiseCapability = NewPromiseCapability(C);
    } catch ( e ) {
      return e;
    }
    try {
      iterator = GetIterator(iterable);
    } catch ( e ) {
      return IfAbruptRejectPromise(e, promiseCapability);
    }
    while ( true ) {
      try {
        next = IteratorStep(iterator);
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      if ( next === false ) {
        return promiseCapability['[[Promise]]'];
      }
      try {
        nextValue = IteratorValue(next);
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      try {
        nextPromise = C.cast(nextValue);
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
      try {
        nextPromise.then(promiseCapability['[[Resolve]]'],
          promiseCapability['[[Reject]]']
        );
      } catch ( e ) {
        return IfAbruptRejectPromise(e, promiseCapability);
      }
    }
  };

  // 25.4.4.5 Promise.reject ( r )
  Promise.reject = function ( r ) {
    var C = this, promiseCapability, rejectResult;
    try {
      promiseCapability = NewPromiseCapability(C);
    } catch ( e ) {
      return e;
    }
    try {
      rejectResult = promiseCapability['[[Reject]]'].call(undefined, r);
    } catch ( e ) {
      return e;
    }
    return promiseCapability['[[Promise]]'];
  };

  // 25.4.4.6 Promise.resolve ( x )
  Promise.resolve = function ( x ) {
    var C = this, promiseCapability, resolveResult;
    try {
      promiseCapability = NewPromiseCapability(C);
    } catch ( e ) {
      return e;
    }
    try {
      resolveResult = promiseCapability['[[Resolve]]'].call(undefined, x);
    } catch ( e ) {
      return e;
    }
    return promiseCapability['[[Promise]]'];
  };

  // 25.4.5.1 Promise.prototype.catch ( onRejected )
  Promise.prototype['catch'] = function ( onRejected ) {
    var promise = this;
    return promise.then(undefined, onRejected);
  };

  // 25.4.5.3 Promise.prototype.then ( onFulfilled , onRejected )
  Promise.prototype.then = function ( onFulfilled , onRejected ) {
    var promise = this,
      C, promiseCapability, rejectionHandler, fulfillmentHandler,
      resolutionHandler, resolveReaction, rejectReaction, resolution;
    if ( !IsPromise(promise) ) {
      throw TypeError();
    }
    try {
      C = promise.constructor;
    } catch ( e ) {
      return e;
    }
    try {
      promiseCapability = NewPromiseCapability(C);
    } catch ( e ) {
      return e;
    }
    if ( IsCallable(onRejected) ) {
      rejectionHandler = onRejected;
    } else {
      rejectionHandler = new ThrowerFunction();
    }
    if ( IsCallable(onFulfilled) ) {
      fulfillmentHandler = onFulfilled;
    } else {
      fulfillmentHandler = new IdentityFunction();
    }
    resolutionHandler = new PromiseResolutionHandlerFunction();
    defineInternal(resolutionHandler, '[[Promise]]', promise);
    defineInternal(resolutionHandler, '[[FulfillmentHandler]]',
      fulfillmentHandler
    );
    defineInternal(resolutionHandler, '[[RejectionHandler]]',
      rejectionHandler
    );
    resolveReaction = {
      '[[Capabilities]]': promiseCapability,
      '[[Handler]]': resolutionHandler
    };
    rejectReaction = {
      '[[Capabilities]]': promiseCapability,
      '[[Handler]]': rejectionHandler
    };
    if ( promise['[[PromiseStatus]]'] === 'unresolved' ) {
      promise['[[PromiseResolveReactions]]'].push(resolveReaction);
      promise['[[PromiseRejectReactions]]'].push(rejectReaction);
    }
    if ( promise['[[PromiseStatus]]'] === 'has-resolution' ) {
      resolution = promise['[[PromiseResult]]'];
      EnqueueTask(PromiseReactionTask, [resolveReaction, resolution]);
    }
    if ( promise['[[PromiseStatus]]'] === 'has-rejection' ) {
      resolution = promise['[[PromiseResult]]'];
      EnqueueTask(PromiseReactionTask, [rejectReaction, resolution]);
    }
    return promiseCapability['[[Promise]]'];
  };

  // 25.4.5.3.1 Identity Functions
  function IdentityFunction () {
    return function F ( x ) {
      return x;
    };
  }

  // 25.4.5.3.2 PromiseResolutionHandlerFunctions
  function PromiseResolutionHandlerFunction () {
    return function F ( x ) {
      var promise = F['[[Promise]]'],
        fulfillmentHandler = F['[[FulfillmentHandler]]'],
        rejectionHandler = F['[[RejectionHandler]]'],
        selfResolutionError, C, promiseCapability, updateResult;
      if ( SameValue(x, promise) ) {
        selfResolutionError = TypeError();
        return rejectionHandler.call(undefined, selfResolutionError);
      }
      C = promise['[[PromiseConstructor]]'];
      try {
        promiseCapability = NewPromiseCapability(C);
      } catch ( e ) {
        return e;
      }
      try {
        updateResult = UpdatePromiseFromPotentialThenable(x,
          promiseCapability
        );
      } catch ( e ) {
        return e;
      }
      if ( updateResult !== 'not a thenable') {
        return promiseCapability['[[Promise]]'].then(fulfillmentHandler,
          rejectionHandler
        );
      }
      return fulfillmentHandler.call(undefined, x);
    };
  }

  // 25.4.5.3.3 Thrower Functions
  function ThrowerFunction () {
    return function F ( e ) {
      throw e;
    };
  }

  // export the Promise constructor
  if ( typeof module === 'object' && typeof module.exports === 'object' ) {
    module.exports = Promise;
  } else {
    global.Promise = Promise;
  }

}(this));
