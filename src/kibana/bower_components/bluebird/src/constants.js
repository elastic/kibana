//This is pretty lame but what you gonna do

//async.js
CONSTANT(LATE_BUFFER_CAPACITY, 16);
CONSTANT(FUNCTION_BUFFER_CAPACITY, 65536);

//errors.js
CONSTANT(ERROR_HANDLED_KEY, "__promiseHandled__");
CONSTANT(OPERATIONAL_ERROR_KEY, "isOperational");
CONSTANT(DEFAULT_STATE, 0);
CONSTANT(STACK_ATTACHED, 1);
CONSTANT(ERROR_HANDLED, 2);

//promise.js
CONSTANT(USE_BOUND, true);
CONSTANT(DONT_USE_BOUND, false);

CONSTANT(PROPAGATE_CANCEL, 1);
CONSTANT(PROPAGATE_TRACE, 2);
CONSTANT(PROPAGATE_BIND, 4);
CONSTANT(PROPAGATE_ALL, PROPAGATE_CANCEL | PROPAGATE_BIND | PROPAGATE_TRACE);

CONSTANT(CALLBACK_FULFILL_OFFSET, 0);
CONSTANT(CALLBACK_REJECT_OFFSET, 1);
CONSTANT(CALLBACK_PROGRESS_OFFSET, 2);
CONSTANT(CALLBACK_PROMISE_OFFSET, 3);
CONSTANT(CALLBACK_RECEIVER_OFFSET, 4);
CONSTANT(CALLBACK_SIZE, 5);
//Layout for ._bitField
//QQWF NCTR BPHS UDLL LLLL LLLL LLLL LLLL
//Q = isGcQueued (Both bits are either on or off to represent
//                    1 bit due to 31-bit integers in 32-bit v8)
//W = isFollowing (The promise that is being followed is not stored explicitly)
//F = isFulfilled
//N = isRejected
//C = isCancellable
//T = isFinal (used for .done() implementation)
//B = isBound
//P = isProxied (optimization when .then listeners on a promise are
//                just respective fate sealers on some other promise)
//H = isRejectionUnhandled
//S = isCarryingStackTrace
//U = isUnhanldedRejectionNotified
//D = isDisposable
//R = [Reserved]
//L = Length, 18 bit unsigned
CONSTANT(NO_STATE, 0x0|0);
CONSTANT(IS_GC_QUEUED, 0xC0000000|0)
CONSTANT(IS_FOLLOWING, 0x20000000|0);
CONSTANT(IS_FULFILLED, 0x10000000|0);
CONSTANT(IS_REJECTED, 0x8000000|0);
CONSTANT(IS_CANCELLABLE, 0x4000000|0);
CONSTANT(IS_FINAL, 0x2000000|0);
CONSTANT(IS_BOUND, 0x800000|0);
CONSTANT(IS_PROXIED, 0x400000|0);
CONSTANT(IS_REJECTION_UNHANDLED, 0x200000|0);
CONSTANT(IS_CARRYING_STACK_TRACE, 0x100000|0);
CONSTANT(IS_UNHANDLED_REJECTION_NOTIFIED, 0x80000|0);
CONSTANT(IS_DISPOSABLE, 0x40000|0);
CONSTANT(LENGTH_MASK, 0x3FFFF|0);
CONSTANT(LENGTH_CLEAR_MASK, ~LENGTH_MASK);
CONSTANT(MAX_LENGTH, LENGTH_MASK);
CONSTANT(IS_REJECTED_OR_FULFILLED, IS_REJECTED | IS_FULFILLED);
CONSTANT(IS_FOLLOWING_OR_REJECTED_OR_FULFILLED, IS_REJECTED_OR_FULFILLED | IS_FOLLOWING);

CONSTANT(AFTER_PROMISIFIED_SUFFIX, "Async");

//promise_array.js
//MUST BE NEGATIVE NUMBERS
CONSTANT(RESOLVE_UNDEFINED, -1);
CONSTANT(RESOLVE_ARRAY, -2);
CONSTANT(RESOLVE_OBJECT, -3);
CONSTANT(RESOLVE_FOREVER_PENDING, -4);
CONSTANT(RESOLVE_CALL_METHOD, -5);

//queue.js
CONSTANT(QUEUE_MAX_CAPACITY, (1 << 30) | 0);
CONSTANT(QUEUE_MIN_CAPACITY, 16);


//captured_trace.js
CONSTANT(FROM_PREVIOUS_EVENT, "From previous event:");

//direct_resolve.js
CONSTANT(THROW, 1);
CONSTANT(RETURN, 2);

//promisify.js
CONSTANT(MAX_PARAM_COUNT, 1023);
CONSTANT(PARAM_COUNTS_TO_TRY, 5);

//deprecated
CONSTANT(OBJECT_PROMISIFY_DEPRECATED, "Promise.promisify for promisifying entire objects is deprecated. Use Promise.promisifyAll instead.");
CONSTANT(SPAWN_DEPRECATED, "Promise.spawn is deprecated. Use Promise.coroutine instead.");

//errors
CONSTANT(CONSTRUCT_ERROR_ARG, "the promise constructor requires a resolver function");
CONSTANT(UNBOUND_RESOLVER_INVOCATION, "Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
CONSTANT(CONSTRUCT_ERROR_INVOCATION, "the promise constructor cannot be invoked directly");
CONSTANT(COLLECTION_ERROR,  "expecting an array, a promise or a thenable" );
CONSTANT(NOT_GENERATOR_ERROR, "generatorFunction must be a function");
CONSTANT(NOT_FUNCTION_ERROR, "fn must be a function");
CONSTANT(LONG_STACK_TRACES_ERROR, "cannot enable long stack traces after promises have been created");
CONSTANT(INSPECTION_VALUE_ERROR, "cannot get fulfillment value of a non-fulfilled promise");
CONSTANT(INSPECTION_REASON_ERROR, "cannot get rejection reason of a non-rejected promise");
CONSTANT(PROMISIFY_TYPE_ERROR, "the target of promisifyAll must be an object or a function");
CONSTANT(CIRCULAR_RESOLUTION_ERROR, "circular promise resolution chain");
CONSTANT(PROPS_TYPE_ERROR, "cannot await properties of a non-object");
CONSTANT(POSITIVE_INTEGER_ERROR, "expecting a positive integer");
CONSTANT(TIMEOUT_ERROR, "operation timed out after");
CONSTANT(YIELDED_NON_PROMISE_ERROR, "A value was yielded that could not be treated as a promise");
