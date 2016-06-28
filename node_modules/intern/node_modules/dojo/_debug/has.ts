import loader = require('./loader');

declare var process: any;
declare var require: loader.IRootRequire;

module has {
	export interface IHas {
		(name: string): any;
		add(name: string, value: (global: Window, document?: HTMLDocument, element?: HTMLDivElement) => any, now?: boolean, force?: boolean): void;
		add(name: string, value: any, now?: boolean, force?: boolean): void;
	}
}

/* tslint:disable:class-name */
interface has extends has.IHas, loader.ILoaderPlugin {}
/* tslint:enable:class-name */

var has: has = require.has;

if (!has) {
	has = (function (): has {
		var hasCache: { [name: string]: any; } = Object.create(null);
		var global: Window = this;
		var document: HTMLDocument = global.document;
		var element: HTMLDivElement = document && document.createElement('div');

		var has: has = <has> function(name: string): any {
			return typeof hasCache[name] === 'function' ? (hasCache[name] = hasCache[name](global, document, element)) : hasCache[name];
		};

		has.add = function (name: string, test: any, now: boolean, force: boolean): void {
			(!(name in hasCache) || force) && (hasCache[name] = test);
			now && has(name);
		};

		return has;
	})();

	has.add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
	has.add('host-node', typeof process === 'object' && process.versions && process.versions.node);
	has.add('debug', true);
}

has.normalize = function (resourceId: string, normalize: (moduleId: string) => string): string {
	var tokens = resourceId.match(/[\?:]|[^:\?]*/g);

	var i = 0;
	function get(skip?: boolean): string {
		var term = tokens[i++];
		if (term === ':') {
			// empty string module name, resolves to 0
			return null;
		}
		else {
			// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
			if (tokens[i++] === '?') {
				if (!skip && has(term)) {
					// matched the feature, get the first value from the options
					return get();
				}
				else {
					// did not match, get the second value, passing over the first
					get(true);
					return get(skip);
				}
			}

			// a module
			return term;
		}
	}

	resourceId = get();
	return resourceId && normalize(resourceId);
};

has.load = function (resourceId: string, require: loader.IRequire, load: (value?: any) => void): void {
	if (resourceId) {
		require([ resourceId ], load);
	}
	else {
		load();
	}
};

export = has;
