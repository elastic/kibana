import core = require('./interfaces');
import on = require('./on');
import aspect = require('./aspect');

class Evented {
	on(type: string, listener: (...args: any[]) => void): core.IHandle {
		return on.parse(this, type, listener, this, (target: Evented, type: string): core.IHandle => {
			var name = '__on' + type;
			if (!(<any> this)[name]) {
				Object.defineProperty(this, name, {
					configurable: true,
					value: undefined,
					writable: true
				});
			}
			return aspect.on(this, '__on' + type, listener);
		});
	}

	emit(type: string, ...args: any[]): boolean {
		type = '__on' + type;
		var method: Function = (<any> this)[type];
		if (method) {
			return method.apply(this, args);
		}
	}
}

export = Evented;
