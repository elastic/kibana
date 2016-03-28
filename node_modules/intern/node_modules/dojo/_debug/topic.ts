import core = require('./interfaces');
import Evented = require('./Evented');

var hub = new Evented();

export function subscribe(topic: string, listener: (...args: any[]) => void): core.IHandle {
	return hub.on.apply(hub, arguments);
}

export function publish(topic: string, ...args: any[]): void {
	hub.emit.apply(hub, arguments);
}
