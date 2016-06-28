import core = require('./interfaces');
import lang = require('./lang');
import Scheduler = require('./Scheduler');

interface ICallbackObject {
	removed?: boolean;
	callback: core.IObserver<any>;
}

interface INotification {
	newValue: any;
	oldValue: any;
	callbacks: Array<ICallbackObject>;
}

// TODO: `informImmediately` is a strange beast, but something that is useful.
// I need to experiment with a different mechanism for calling the observer
// initially than providing a boolean parameter to `observe()`.

class Observable implements core.IObservable {
	private _callbacks: { [property: string]: ICallbackObject[] };
	private _notifications: { [property: string]: INotification };
	private _timer: core.IHandle;

	constructor(props?: any) {
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

	private _dispatch() {
		if (this._timer) {
			this._timer.remove();
			this._timer = null;
		}

		// Grab the current notifications and immediately create a new hash
		// to start storing any notifications that might be generated this turn
		var notifications = this._notifications;
		this._notifications = Object.create(null);

		for (var property in notifications) {
			var notification = notifications[property];

			if (this._isEqual(notification.oldValue, notification.newValue)) {
				// If a different-value notification is in-flight and something changes
				// the value back to what it started as, skip the notification
				continue;
			}

			var callback: ICallbackObject;
			for (var i = 0; (callback = notification.callbacks[i]); i++) {
				// If a callback was removed after the notification was scheduled to
				// start, don't call it
				if (!callback.removed) {
					callback.callback.call(this, notification.newValue, notification.oldValue);
				}
			}
		}
	}

	_isEqual(a: any, b: any): boolean {
		return lang.isEqual(a, b);
	}

	/* tslint:disable:no-unused-variable */
	private _notify<T>(property: string, newValue: T, oldValue: T): void {
	/* tslint:enable:no-unused-variable */
		var callbacks = this._callbacks[property];
		if (!callbacks || !callbacks.length) {
			return;
		}

		var notification = this._notifications[property];

		if (notification) {
			notification.newValue = newValue;
		}
		else {
			// Create a notification and give it a copy of the callbacks
			// that are currently registered
			this._notifications[property] = {
				newValue: newValue,
				oldValue: oldValue,
				callbacks: callbacks.slice(0)
			};
		}

		this._schedule();
	}

	observe<T>(property: string, callback: core.IObserver<T>): core.IHandle {
		var callbackObject: ICallbackObject = {
			callback: callback
		};

		if (!this._callbacks[property]) {
			var oldDescriptor = lang.getPropertyDescriptor(this, property),
				currentValue: any = (<any> this)[property],
				descriptor: PropertyDescriptor = {
					configurable: true,
					enumerable: true
				};

			if (oldDescriptor && !('value' in oldDescriptor)) {
				descriptor.get = oldDescriptor.get;

				if (oldDescriptor.set) {
					descriptor.set = function (value: any) {
						oldDescriptor.set.apply(this, arguments);
						var newValue = descriptor.get.call(this);

						this._notify(property, newValue, currentValue);
						currentValue = newValue;
					};
				}
			}
			else {
				// property
				descriptor.get = () => {
					return currentValue;
				};
				if (oldDescriptor.writable) {
					descriptor.set = function (newValue: any) {
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
				this.remove = () => {};
				// remove from in-flight notifications
				callbackObject.removed = true;
				// remove from future notifications
				lang.pullFromArray(self._callbacks[property], callbackObject);
			}
		};
	}

	_schedule(): void {
		if (!this._timer) {
			this._timer = Scheduler.schedule(this._dispatch);
		}
	}
}

export = Observable;
