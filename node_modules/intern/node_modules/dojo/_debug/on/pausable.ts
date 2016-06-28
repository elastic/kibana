import core = require('../interfaces');
import on = require('../on');

module pausable {
	export interface IPausableHandle extends core.IHandle {
		pause(): void;
		resume(): void;
	}
}

function pausable(type: string): on.IExtensionEvent {
	return function (target: any, listener: Function, capture?: boolean): pausable.IPausableHandle {
		var paused: boolean;
		var handle = <pausable.IPausableHandle> on(target, type, function (): void {
			if (!paused) {
				listener.apply(this, arguments);
			}
		}, capture);

		handle.pause = function (): void {
			paused = true;
		};
		handle.resume = function (): void {
			paused = false;
		};
		return handle;
	};
}

export = pausable;
