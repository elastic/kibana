#Deprecated APIs

This file contains documentation for APIs that are no longer supported by Bluebird. 
These APIs still work in Bluebird but will be removed at a future version of the library.

For every use case that the methods below solve there exists a better alternative in [the API reference](./API.md).

- [Progression](#progression)
    - [`.progressed(Function handler)`](#progressedfunction-handler---promise)
    - [`.then([Function fulfilledHandler] [, Function rejectedHandler ] [, Function progressHandler ])`](#thenfunction-fulfilledhandler--function-rejectedhandler---function-progresshandler----promise)
    - [`.done([Function fulfilledHandler] [, Function rejectedHandler ] [, Function progressHandler ])`](#donefunction-fulfilledhandler--function-rejectedhandler---function-progresshandler----promise)
    - [`.fork([Function fulfilledHandler] [, Function rejectedHandler ] [, Function progressHandler ])`](#forkfunction-fulfilledhandler--function-rejectedhandler---function-progresshandler----promise)

- [Promise resolution](#promise-resolution)
    - [`.resolve(dynamic value)`](#resolvedynamic-value---undefined)
    - [`.reject(dynamic reason)`](#rejectdynamic-reason---undefined)
    - [`.progress(dynamic value)`](#progressdynamic-value---undefined)
    - [`.callback`](#callback---function)
    


##Progression

The old progression API was meant to be used for tracking the progress of promise resolution. In retrospect, it did not work or compose very well. We understand that problem better now and the use case could be better solved without it.

See [Progression Migration](./API.md#progression-migration) for migration assistance and examples of how to convert APIs that use progression to ones that do not. 

#####`.progressed(Function handler)` -> `Promise`


Shorthand for `.then(null, null, handler);`. Attach a progress handler that will be called if this promise is progressed. Returns a new promise chained from this promise.

<hr>

#####`.then([Function fulfilledHandler] [, Function rejectedHandler ] [, Function progressHandler ])` -> `Promise`

The standard [Promises/A+ `.then()`](http://promises-aplus.github.io/promises-spec/) is still supported by Bluebird and support for it will continue indefinitely . However, the variant accepting a third `progressHandler` argument is no longer supported.

<hr>


#####`.done([Function fulfilledHandler] [, Function rejectedHandler ] [, Function progressHandler ])` -> `void`

Like `.then()`, but any unhandled rejection that ends up here will be thrown as an error. Again, only the variant with the progression handler is deprecated here. `.done` is still fully supported.

<hr>


#####`.fork([Function fulfilledHandler] [, Function rejectedHandler ] [, Function progressHandler ])` -> `Promise`

Like `.then()`, but cancellation of the the returned promise or any of its descendant will not propagate cancellation to this promise or this promise's ancestors. Again, only the variant with the progression handler is deprecated here. `.fork` is still fully supported.

<hr>


##Promise resolution

A `PromiseResolver` can be used to control the fate of a promise. It is like "Deferred" in jQuery or `$q.defer` in $q. The `PromiseResolver` objects have a `.promise` property which returns a reference to the controlled promise that can be passed to clients. `.promise` of a `PromiseResolver` is not a getter function to match other implementations.

The methods of a `PromiseResolver` have no effect if the fate of the underlying promise is already decided (follow, reject, fulfill).

**The use of `Promise.defer` and deferred objects is discouraged - it is much more awkward and error-prone than using `new Promise`.**

<hr>

#####`.resolve(dynamic value)` -> `undefined`

Resolve the underlying promise with `value` as the resolution value. If `value` is a thenable or a promise, the underlying promise will assume its state.

<hr>

#####`.reject(dynamic reason)` -> `undefined`

Reject the underlying promise with `reason` as the rejection reason.

<hr>

#####`.progress(dynamic value)` -> `undefined`

Progress the underlying promise with `value` as the progression value.

Example

```js
function delay(ms) {
    var resolver = Promise.defer();
    var now = Date.now();
    setTimeout(function(){
        resolver.resolve(Date.now() - now);
    }, ms);
    return resolver.promise;
}

delay(500).then(function(ms){
    console.log(ms + " ms passed");
});
```

<hr>


