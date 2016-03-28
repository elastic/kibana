import lang = require('./lang');

declare var exports: any;

export function repeat(string: string, times: number): string {
	if (!string || times <= 0) {
		return '';
	}

	var buffer: string[] = [];
	while (true) {
		if (times & 1) {
			buffer.push(string);
		}
		times >>= 1;
		if (!times) {
			break;
		}
		string += string;
	}
	return buffer.join('');
}

enum Padding {
	Left,
	Right,
	Both
};

function _pad(text: string, size: number, character: string, position: Padding = Padding.Right): string {
	var length = size - text.length,
		pad = exports.repeat(character, Math.ceil(length / character.length));

	if (position === Padding.Left) {
		return pad + text;
	}
	else if (position === Padding.Right) {
		return text + pad;
	}
	else {
		var left = Math.ceil(length / 2);
		return pad.substr(0, left) + text + pad.substr(0, length - left);
	}
}

export function pad(text: string, size: number, character: string = ' '): string {
	return _pad(text, size, character, Padding.Both);
}

export function padr(text: string, size: number, character: string = ' '): string {
	return _pad(text, size, character, Padding.Right);
}
export function padl(text: string, size: number, character: string = ' '): string {
	return _pad(text, size, character, Padding.Left);
}

export interface ITransform {
	(value: any, key?: string): any;
}

var substitutePattern = /\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g;
function defaultTransform(value: any): any {
	return value;
};
export function substitute(template: string, map: Object, transform?: ITransform, context?: any): string;
export function substitute(template: string, map: Array<any>, transform?: ITransform, context?: any): string;
export function substitute(template: string, map: any, transform?: ITransform, context?: any): string {
	context = context || undefined;
	transform = transform ? transform.bind(context) : defaultTransform;

	return template.replace(substitutePattern, function (match: string, key: string, format: string) {
		var value = lang.getProperty(map, key);
		if (format) {
			value = lang.getProperty(context, format).call(context, value, key);
		}
		return transform(value, key) + '';
	});
}

export function count(haystack: string, needle: string): number {
	var hits = 0,
		lastIndex = haystack.indexOf(needle);

	while (lastIndex > -1) {
		++hits;
		lastIndex = haystack.indexOf(needle, lastIndex + 1);
	}

	return hits;
}

var regExpPattern = /[-\[\]{}()*+?.,\\\^$|#\s]/g;
export function escapeRegExpString(string: string): string {
	return string.replace(regExpPattern, '\\$&');
}
