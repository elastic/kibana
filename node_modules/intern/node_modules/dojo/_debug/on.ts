import core = require('./interfaces');
import Evented = require('./Evented');

module on {
	export interface IExtensionEvent {
		(target: any, listener: EventListener): core.IHandle;
	}

	export interface IOnAddListener {
		(target: any, type: string, listener: Function, capture?: boolean): core.IHandle;
	}
}

/* tslint:disable:class-name */
interface on {
/* tslint:enable:class-name */
	(target: HTMLElement, type: string, listener: EventListener, capture?: boolean): core.IHandle;
	(target: HTMLElement, type: on.IExtensionEvent, listener: EventListener, capture?: boolean): core.IHandle;
	(target: Evented, type: string, listener: EventListener, capture?: boolean): core.IHandle;
	(target: Evented, type: on.IExtensionEvent, listener: EventListener, capture?: boolean): core.IHandle;
	parse(target: HTMLElement, type: string, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	parse(target: HTMLElement, type: on.IExtensionEvent, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	parse(target: Evented, type: string, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	parse(target: Evented, type: on.IExtensionEvent, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	emit(target: HTMLElement, type: string, event?: Object): boolean;
	emit(target: Evented, type: string, event?: Object): boolean;
}

function noop(): void {}

function addListener(target: any, type: string, listener: Function, capture?: boolean): core.IHandle {
	if (target.addEventListener) {
		target.addEventListener(type, listener, capture);

		return {
			remove: function (): void {
				this.remove = noop;
				target.removeEventListener(type, listener, capture);
				target = listener = null;
			}
		};
	}

	throw new Error('Target must be an event emitter');
}

var on: on = <on> function (target: any, type: any, listener: EventListener, capture?: boolean): core.IHandle {
	if (typeof target.on === 'function' && typeof type !== 'function' && !target.nodeType) {
		return target.on(type, listener, capture);
	}

	return on.parse(target, type, listener, this, addListener, capture);
};

on.parse = function (target: any, type: any, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle {
	// `type` is ExtensionEvent
	if (type.call) {
		return type.call(context, target, listener, capture);
	}

	if (type.indexOf(',') > -1) {
		var events = type.split(/\s*,\s*/);
		var handles: core.IHandle[] = events.map(function (type: string): core.IHandle {
			return addListener(target, type, listener, capture);
		});

		return {
			remove: function (): void {
				this.remove = noop;
				var handle: core.IHandle;
				while ((handle = handles.pop())) {
					handle.remove();
				}
			}
		};
	}

	return addListener(target, type, listener, capture);
};

on.emit = function (target: any, type: string, event?: any): boolean {
	// `target` is not a DOM node
	if (typeof target.emit === 'function' && !target.nodeType) {
		return target.emit(type, event);
	}

	if (target.dispatchEvent && target.ownerDocument && target.ownerDocument.createEvent) {
		var nativeEvent = target.ownerDocument.createEvent('HTMLEvents');
		nativeEvent.initEvent(type, Boolean(event.bubbles), Boolean(event.cancelable));

		for (var key in event) {
			if (!(key in nativeEvent)) {
				nativeEvent[key] = event[key];
			}
		}

		return target.dispatchEvent(nativeEvent);
	}

	throw new Error('Target must be an event emitter');
};

export = on;
