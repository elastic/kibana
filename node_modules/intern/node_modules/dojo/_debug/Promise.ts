import nextTick = require('./nextTick');

type Callback = (...args: any[]) => void;

function isPromise(value: any): boolean {
	return value && typeof value.then === 'function';
}

function runCallbacks(callbacks: Array<Callback>, ...args: any[]): void {
	for (var i = 0, callback: Callback; callback = callbacks[i]; ++i) {
		callback.apply(null, args);
	}
}

/**
 * A Promise represents the result of an asynchronous operation. When writing a function that performs an asynchronous
 * operation, instead of writing the function to accept a callback function, you should instead write it to return a
 * Promise that is fulfilled once the asynchronous operation is completed. Returning a promise instead of accepting
 * a callback provides a standard mechanism for handling asynchronous operations that offers the following benefits
 * over a normal callback function:
 *
 * 1. Multiple callbacks can be added for a single function invocation;
 * 2. Other asynchronous operations can be easily chained to the response, avoiding callback pyramids;
 * 3. Asynchronous operations can be canceled in flight in a standard way if their results are no longer needed by the
 *    rest of the application.
 *
 * The Promise class is a modified, extended version of standard EcmaScript 6 promises. This implementation
 * intentionally deviates from the ES6 2014-05-22 draft in the following ways:
 *
 * 1. `Promise.race` is a worthless API with one use case, so is not implemented.
 * 2. `Promise.all` accepts an object in addition to an array.
 * 3. Asynchronous operations can transmit partial progress information through a third `progress` method passed to the
 *    initializer. Progress listeners can be added by passing a third `onProgress` callback to `then`, or through the
 *    extra `progress` method exposed on promises.
 * 4. Promises can be canceled by calling the `cancel` method of a promise.
 */
class Promise<T> {
	/**
	 * Converts an iterable object containing promises into a single promise that resolves to a new iterable object
	 * containing all the fulfilled properties of the original object. Properties that do not contain promises are
	 * passed through as-is.
	 *
	 * @example
	 * Promise.all([ Promise.resolve('foo'), 'bar' ]).then(function (value) {
	 *   value[0] === 'foo'; // true
	 *   value[1] === 'bar'; // true
	 * });
	 *
	 * @example
	 * Promise.all({
	 *   foo: Promise.resolve('foo'),
	 *   bar: 'bar'
	 * }).then(function (value) {
	 *   value.foo === 'foo'; // true
	 *   value.bar === 'bar'; // true
	 * });
	 */
	static all<T>(iterable: { [key: string]: Promise.Thenable<T> | T; }): Promise<{ [key: string]: T; }>;
	static all<T>(iterable: Array<Promise.Thenable<T> | T>): Promise<T[]>;
	static all(iterable: any): Promise<any> {
		return new this(function (resolve, reject, progress, setCanceler) {
			setCanceler(function (reason: Error) {
				walkIterable(function (key: string, value: any) {
					if (value && value.cancel) {
						value.cancel(reason);
					}
				});

				throw reason;
			});

			function fulfill(key: string, value: any) {
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

			function processItem(key: string, value: any) {
				++total;
				if (isPromise(value)) {
					value.then(fulfill.bind(null, key), reject);
				}
				else {
					fulfill(key, value);
				}
			}

			function walkIterable(callback: (key: string, value: any) => void) {
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

			var values: any = Array.isArray(iterable) ? [] : {};
			var complete = 0;
			var total = 0;

			var populating = true;
			walkIterable(processItem);
			populating = false;
			finish();
		});
	}

	/**
	 * Creates a new promise that is pre-rejected with the given error.
	 */
	static reject(error?: Error): Promise<any> {
		return new this<any>(function (resolve, reject) {
			reject(error);
		});
	}

	/**
	 * Creates a new promise that is pre-resolved with the given value. If the passed value is already a promise, it
	 * will be returned as-is.
	 */
	static resolve<T>(value?: Promise.Thenable<T> | T): Promise<T> {
		if (value instanceof Promise) {
			return value;
		}

		return new this<T>(function (resolve) {
			resolve(value);
		});
	}

	/**
	 * Creates a new Promise.
	 *
	 * @constructor
	 *
	 * @param initializer
	 * The initializer function is called immediately when the Promise is instantiated. It is responsible for starting
	 * the asynchronous operation when it is invoked.
	 *
	 * The initializer must call either the passed `resolve` function when the asynchronous operation has completed
	 * successfully, or the `reject` function when the operation fails, unless the the `canceler` is called first.
	 *
	 * The `progress` function can also be called zero or more times to provide information about the process of the
	 * operation to any interested consumers.
	 *
	 * Finally, the initializer can register an canceler function that cancels the asynchronous operation by passing
	 * the canceler function to the `setCanceler` function.
	 */
	constructor(
		initializer: (
			resolve?: (value?: Promise.Thenable<T> | T) => void,
			reject?: (error?: Error) => void,
			progress?: (data?: any) => void,
			setCanceler?: (canceler: Promise.Canceler) => void
		) => void
	) {
		/**
		 * The current state of this promise.
		 */
		var state: Promise.State = Promise.State.PENDING;
		Object.defineProperty(this, 'state', {
			get: function () {
				return state;
			}
		});

		/**
		 * Whether or not this promise is in a resolved state.
		 */
		function isResolved(): boolean {
			return state !== Promise.State.PENDING || isChained;
		}

		/**
		 * If true, the resolution of this promise is chained to another promise.
		 */
		var isChained: boolean = false;

		/**
		 * The resolved value for this promise.
		 */
		var resolvedValue: T | Error;

		/**
		 * Callbacks that should be invoked once the asynchronous operation has completed.
		 */
		var callbacks: Array<() => void> = [];
		var whenFinished = function (callback: () => void) {
			callbacks.push(callback);
		};

		/**
		 * Callbacks that should be invoked when the asynchronous operation has progressed.
		 */
		var progressCallbacks: Array<(data?: any) => void> = [];
		var whenProgress = function (callback: (data?: any) => void) {
			progressCallbacks.push(callback);
		};

		/**
		 * A canceler function that will be used to cancel resolution of this promise.
		 */
		var canceler: Promise.Canceler;

		/**
		 * Queues a callback for execution during the next round through the event loop, in a way such that if a
		 * new execution is queued for this promise during queue processing, it will execute immediately instead of
		 * being forced to wait through another turn through the event loop.
		 * TODO: Ensure this is actually necessary for optimal execution and does not break next-turn spec compliance.
		 *
		 * @method
		 * @param callback The callback to execute on the next turn through the event loop.
		 */
		var enqueue = (function () {
			function originalSchedule() {
				schedule = function () {};

				nextTick(function run() {
					try {
						var callback: Callback;
						while ((callback = queue.shift())) {
							callback();
						}
					}
					finally {
						// If someone threw an error, allow it to bubble, then continue queue execution for the
						// remaining items
						if (queue.length) {
							run();
						}
						else {
							schedule = originalSchedule;
						}
					}
				});
			}

			var queue: Array<Callback> = [];
			var schedule = originalSchedule;

			return function (callback: Callback) {
				queue.push(callback);
				schedule();
			};
		})();

		/**
		 * Resolves this promise.
		 *
		 * @param newState The resolved state for this promise.
		 * @param {T|Error} value The resolved value for this promise.
		 */
		var resolve = function (newState: Promise.State, value: any) {
			if (isResolved()) {
				return;
			}

			if (isPromise(value)) {
				if (value === this) {
					settle(Promise.State.REJECTED, new TypeError('Cannot chain a promise to itself'));
					return;
				}

				try {
					value.then(
						settle.bind(null, Promise.State.FULFILLED),
						settle.bind(null, Promise.State.REJECTED)
					);
					isChained = true;

					// If this promise resolution has been chained to another promise A, and then someone calls `then`
					// on this promise to create promise B, then calls `cancel` on promise B, it needs to propagate
					// back to cancel the chained promise A
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

		/**
		 * Settles this promise.
		 *
		 * @param newState The resolved state for this promise.
		 * @param {T|Error} value The resolved value for this promise.
		 */
		function settle(newState: Promise.State, value: any) {
			if (state !== Promise.State.PENDING) {
				return;
			}

			state = newState;
			resolvedValue = value;
			whenFinished = enqueue;
			whenProgress = function () {};
			enqueue(function () {
				runCallbacks(callbacks);
				callbacks = progressCallbacks = null;
			});
		}

		this.cancel = function (reason?) {
			// Settled promises are 100% finished and cannot be cancelled
			if (state !== Promise.State.PENDING) {
				return;
			}

			if (!reason) {
				reason = new Error('Cancelled');
				reason.name = 'CancelError';
			}

			// The promise is non-cancellable so just reject it for consistency (this will at least bypass any more
			// code that would run in chained success callbacks)
			if (!canceler) {
				settle(Promise.State.REJECTED, reason);
				return Promise.reject(reason);
			}

			try {
				// The canceller has a last opportunity to fulfill the promise with some data (for example something
				// from an outdated local cache), or else should throw the reason
				resolve(Promise.State.FULFILLED, canceler(reason));
			}
			catch (error) {
				settle(Promise.State.REJECTED, error);

				// If a promise was chained so another promise adopted this `this.cancel` as its canceler, we need to
				// provide a rejection, otherwise that other promise will believe the cancelation resulted in a
				// successful value of `undefined`
				// TODO: There should be a better way to do this
				// TODO: Test
				return Promise.reject(error);
			}
		};

		this.then = function <U>(
			onFulfilled?: (value?: T) => Promise.Thenable<U> | U,
			onRejected?: (error?: Error) => Promise.Thenable<U> | U,
			onProgress?: (data?: any) => any
		): Promise<U> {
			return new Promise<U>(function (resolve, reject, progress, setCanceler) {
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
					var callback: (value?: any) => any = state === Promise.State.REJECTED ? onRejected : onFulfilled;

					if (typeof callback === 'function') {
						try {
							resolve(callback(resolvedValue));
						}
						catch (error) {
							reject(error);
						}
					}
					else if (state === Promise.State.REJECTED) {
						reject(<Error> resolvedValue);
					}
					else {
						// Assume T and U are compatible types
						resolve(<any> resolvedValue);
					}
				});
			});
		};

		try {
			initializer(
				resolve.bind(null, Promise.State.FULFILLED),
				resolve.bind(null, Promise.State.REJECTED),
				function (data) {
					if (state === Promise.State.PENDING) {
						enqueue(runCallbacks.bind(null, progressCallbacks, data));
					}
				},
				function (value) {
					if (!isResolved()) {
						canceler = value;
					}
				}
			);
		}
		catch (error) {
			settle(Promise.State.REJECTED, error);
		}
	}

	/**
	 * The current state of the promise.
	 *
	 * @readonly
	 */
	state: Promise.State;

	/**
	 * Cancels any pending asynchronous operation of the promise.
	 *
	 * @method
	 * @param reason
	 * A specific reason for failing the operation. If no reason is provided, a default `CancelError` error will be
	 * used.
	 */
	cancel: (reason?: Error, source?: Promise<any>) => void;

	/**
	 * Adds a callback to the promise to be invoked when the asynchronous operation throws an error.
	 */
	catch<U>(onRejected: (error?: Error) => Promise.Thenable<U> | U): Promise<U> {
		return this.then<U>(null, onRejected);
	}

	/**
	 * Adds a callback to the promise to be invoked regardless of whether or not the asynchronous operation completed
	 * successfully. The callback can throw or return a new value to replace the original value, or if it returns
	 * undefined, the original value or error will be passed through.
	 */
	finally<U>(onFulfilledOrRejected: () => Promise.Thenable<U> | U): Promise<U> {
		function getFinalValue(defaultCallback: () => U): Promise.Thenable<U> | U {
			var returnValue = onFulfilledOrRejected();

			if (returnValue === undefined) {
				return defaultCallback();
			}
			else if (returnValue && (<Promise.Thenable<U>> returnValue).then) {
				return (<Promise.Thenable<U>> returnValue).then(function (returnValue) {
					return returnValue !== undefined ? returnValue : defaultCallback();
				});
			}
			else {
				return returnValue;
			}
		}

		return this.then<U>(function (value) {
			return getFinalValue(function (): any {
				return value;
			});
		}, function (error) {
			return getFinalValue(function (): any {
				throw error;
			});
		});
	}

	/**
	 * Adds a callback to the promise to be invoked when progress occurs within the asynchronous operation.
	 */
	progress(onProgress: (data?: any) => any): Promise<T> {
		return this.then<T>(null, null, onProgress);
	}

	/**
	 * Adds a callback to the promise to be invoked when the asynchronous operation completes successfully.
	 */
	then: <U>(
		onFulfilled?: (value?: T) => Promise.Thenable<U> | U,
		onRejected?: (error?: Error) => Promise.Thenable<U> | U,
		onProgress?: (data?: any) => any
	) => Promise<U>;
}

module Promise {
	export interface Canceler {
		(reason: Error): any;
	}

	/**
	 * The Deferred class unwraps a promise in order to expose its internal state management functions.
	 */
	export class Deferred<T> {
		/**
		 * The underlying promise for the Deferred.
		 */
		promise: Promise<T>;

		constructor(canceler?: Promise.Canceler) {
			this.promise = new Promise<T>((resolve, reject, progress, setCanceler) => {
				this.progress = progress;
				this.reject = reject;
				this.resolve = resolve;
				canceler && setCanceler(canceler);
			});
		}

		/**
		 * Sends progress information for the underlying promise.
		 *
		 * @method
		 * @param data Additional information about the asynchronous operation’s progress.
		 */
		progress: (data?: any) => void;

		/**
		 * Rejects the underlying promise with an error.
		 *
		 * @method
		 * @param error The error that should be used as the fulfilled value for the promise.
		 */
		reject: (error?: Error) => void;

		/**
		 * Resolves the underlying promise with a value.
		 *
		 * @method
		 * @param value The value that should be used as the fulfilled value for the promise.
		 */
		resolve: (value?: Promise.Thenable<T> | T) => void;
	}

	/**
	 * The State enum represents the possible states of a promise.
	 */
	export enum State {
		PENDING,
		FULFILLED,
		REJECTED
	}

	export interface Thenable<T> {
		then<U>(
			onFulfilled?: (value?: T) => Promise.Thenable<U> | U,
			onRejected?: (error?: Error) => Promise.Thenable<U> | U
		): Promise.Thenable<U>;
	}
}

export = Promise;
