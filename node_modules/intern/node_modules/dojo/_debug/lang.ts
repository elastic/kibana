import has = require('./has');

has.add('es6-getpropertydescriptor', typeof (<any> Object).getPropertyDescriptor === 'function');

var slice = Array.prototype.slice;

function getDottedProperty(object: any, parts: string[], create: boolean): any {
	var key: string;
	var i: number = 0;

	while (object && (key = parts[i++])) {
		if (typeof object !== 'object') {
			return undefined;
		}
		object = key in object ? object[key] : (create ? object[key] = {} : undefined);
	}

	return object;
}

export function setProperty(object: any, propertyName: string, value: any): void {
	var parts: string[] = propertyName.split('.');
	var part: string = parts.pop();
	var property: any = getDottedProperty(object, parts, true);

	if (property && part) {
		property[part] = value;
		return value;
	}
}

export function getProperty(object: any, propertyName: string, create: boolean = false): any {
	return getDottedProperty(object, propertyName.split('.'), create);
}

function _mixin<T>(target: any, source: any): T {
	for (var name in source) {
		var sourceValue: any = source[name];
		// TODO: If it is already the same, what are we saving by doing this?
		if (name in target && target[name] === sourceValue) {
			// skip properties that target already has
			continue;
		}
		target[name] = sourceValue;
	}

	return target;
}

export function mixin<T extends Object>(target: T, ...sources: any[]): T;
export function mixin<T extends Object>(target: any, ...sources: any[]): T;
export function mixin(target: any, ...sources: any[]): any {
	if (!target) {
		target = {};
	}
	for (var i: number = 0; i < sources.length; i++) {
		_mixin(target, sources[i]);
	}
	return target;
}

export function delegate<T extends Object>(object: T, properties?: any): T;
export function delegate<T extends Object>(object: any, properties?: any): T;
export function delegate(object: any, properties?: any): any {
	object = Object.create(object);
	_mixin(object, properties);
	return object;
}

var _bind = Function.prototype.bind;
export function bind<T extends Function>(context: any, fn: Function, ...extra: any[]): T;
export function bind<T extends Function>(context: any, method: string, ...extra: any[]): T;
export function bind(context: any, fn: any, ...extra: any[]): any {
	if (typeof fn === 'function') {
		return _bind.apply(fn, [ context ].concat(extra));
	}
	return function (): any {
		return context[fn].apply(context, extra.concat(slice.call(arguments, 0)));
	};
}

export function partial<T extends Function>(fn: Function, ...extra: any[]): T;
export function partial(fn: Function, ...extra: any[]): any {
	return function (): any {
		return fn.apply(this, extra.concat(slice.call(arguments, 0)));
	};
}

export function deepMixin<T extends Object>(target: T, source: any): T;
export function deepMixin<T extends Object>(target: any, source: any): T;
export function deepMixin(target: any, source: any): any {
	if (source && typeof source === 'object') {
		if (Array.isArray(source)) {
			(<any> target).length = source.length;
		}

		for (var name in source) {
			var targetValue: any = target[name];
			var sourceValue: any = source[name];

			if (targetValue !== sourceValue) {
				if (sourceValue && typeof sourceValue === 'object') {
					if (
						sourceValue instanceof RegExp ||
						sourceValue instanceof Date ||
						sourceValue instanceof String ||
						sourceValue instanceof Number ||
						sourceValue instanceof Boolean
					) {
						target[name] = targetValue = new sourceValue.constructor(sourceValue);
					}
					else if (!targetValue || typeof targetValue !== 'object') {
						target[name] = targetValue = Array.isArray(sourceValue) ? [] : {};
					}
					deepMixin(targetValue, sourceValue);
				}
				else {
					target[name] = sourceValue;
				}
			}
		}
	}

	return target;
}

export function deepDelegate<T extends Object>(source: T, properties?: any): T;
export function deepDelegate<T extends Object>(source: any, properties?: any): T;
export function deepDelegate(source: any, properties?: any): any {
	var target: any = delegate(source);

	for (var name in source) {
		var value: any = source[name];

		if (value && typeof value === 'object') {
			target[name] = deepDelegate<typeof value>(value);
		}
	}

	return deepMixin<any>(target, properties);
}

export function isEqual(a: any, b: any): boolean {
	return a === b || /* both values are NaN */ (a !== a && b !== b);
}

export var getPropertyDescriptor: (object: any, property: string) => PropertyDescriptor;

if (has('es6-getpropertydescriptor')) {
	getPropertyDescriptor = (<any> Object).getPropertyDescriptor;
}
else {
	getPropertyDescriptor = (object: any, property: string): PropertyDescriptor => {
		var descriptor: PropertyDescriptor;

		while (object) {
			descriptor = Object.getOwnPropertyDescriptor(object, property);

			if (descriptor) {
				return descriptor;
			}

			object = Object.getPrototypeOf(object);
		}

		return null;
	};
}

export function pullFromArray<T>(haystack: T[], needle: T): T[] {
	var removed: T[] = [];
	var i: number = 0;

	while ((i = haystack.indexOf(needle, i)) > -1) {
		removed.push(haystack.splice(i, 1)[0]);
	}

	return removed;
}
