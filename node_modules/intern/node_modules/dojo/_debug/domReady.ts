import has = require('./has');
import loader = require('./loader');

if (!has('host-browser')) {
	throw new Error('dojo/domReady makes no sense to load in a non-browser environment');
}

var readyStates = Object.create(null);
readyStates.loaded = readyStates.complete = true;

var ready = readyStates[document.readyState],
	readyQueue: Function[] = [],
	processing = false;

function processQueue(): void {
	if (processing) {
		return;
	}
	processing = true;

	for (var i = 0; i < readyQueue.length; i++) {
		readyQueue[i](document);
	}

	processing = false;
}

if (!ready) {
	document.addEventListener('DOMContentLoaded', function (): void {
		if (ready) {
			return;
		}

		ready = true;
		processQueue();
	});
}

/* tslint:disable:class-name */
interface domReady extends loader.ILoaderPlugin {
/* tslint:enable:class-name */
	(callback: () => void): void;
}

var domReady = <domReady> function (callback: (...args: any[]) => void): void {
	readyQueue.push(callback);
	if (ready) {
		processQueue();
	}
};

domReady.load = function (resourceId: string, require: loader.IRequire, load: (value?: any) => void): void {
	domReady(load);
};

export = domReady;
