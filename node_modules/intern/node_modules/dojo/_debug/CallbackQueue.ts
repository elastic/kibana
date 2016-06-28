import core = require('./interfaces');

interface IQueueItem<T extends Function> {
	active: boolean;
	callback: T;
}
class CallbackQueue<T extends Function> {
	private _callbacks: IQueueItem<T>[] = [];

	add(callback: T): core.IHandle {
		var _callback = {
			active: true,
			callback: callback
		};

		this._callbacks.push(_callback);
		callback = null;

		return {
			remove: function () {
				this.remove = function () {};
				_callback.active = false;
				_callback = null;
			}
		};
	}

	drain(...args: any[]): void {
		var callbacks = this._callbacks;
		var item: IQueueItem<T>;

		// Any callbacks added after drain is called will be processed
		// the next time drain is called
		this._callbacks = [];

		for (var i = 0; i < callbacks.length; i++) {
			item = callbacks[i];
			if (item && item.active) {
				item.callback.apply(null, args);
			}
		}
	}
}

export = CallbackQueue;
