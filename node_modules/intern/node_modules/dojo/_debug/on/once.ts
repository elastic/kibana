import core = require('../interfaces');
import on = require('../on');

function once(type: string): on.IExtensionEvent {
	return function (target: any, listener: Function, capture?: boolean): core.IHandle {
		var handle = on(target, type, function (): void {
			handle.remove();
			listener.apply(this, arguments);
		});
		return handle;
	};
};

export = once;
