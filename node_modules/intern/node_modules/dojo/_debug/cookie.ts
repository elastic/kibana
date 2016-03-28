import string = require('./string');

declare var exports: any;

var longAgo = new Date(1970, 0, 1).toUTCString();

export interface IOptions {
	expires?: any;
	maxAge?: number;
	path?: string;
	domain?: string;
	secure?: boolean;
}

function createCookieOptions(options: IOptions): string {
	var optionsString = '';

	for (var key in options) {
		var value: any = (<any> options)[key];

		if (key === 'maxAge') {
			key = 'max-age';
		}
		else if (key === 'secure' && !value) {
			continue;
		}

		optionsString += '; ' + encodeURIComponent(key);

		if (key === 'secure') {
			// secure is a boolean flag, so provide no value
		}
		else if (key === 'expires') {
			// Expires will not work if its value is URI-encoded
			optionsString += '=' + (value.toUTCString ? value.toUTCString() : value);
		}
		else {
			optionsString += '=' + encodeURIComponent(value);
		}
	}

	return optionsString;
}

Object.defineProperty(exports, 'length', {
	get: function () {
		return document.cookie.length ? string.count(document.cookie, '; ') + 1 : 0;
	},
	enumerable: true,
	configurable: true
});

export function key(index: number): string {
	var keyValuePair = document.cookie.split('; ', index + 1)[index];
	return keyValuePair ? decodeURIComponent(/^([^=]+)/.exec(keyValuePair)[0]) : null;
}

export function getItem(key: string): string {
	var match = new RegExp('(?:^|; )' + string.escapeRegExpString(encodeURIComponent(key)) + '=([^;]*)').exec(document.cookie);
	return match ? decodeURIComponent(match[1]) : null;
}

export function setItem(key: string, data: string, options: IOptions = {}): void {
	document.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(data) + createCookieOptions(options);
}

export function removeItem(key: string, options?: IOptions): void {
	options = options ? Object.create(options) : {};
	options.expires = longAgo;
	document.cookie = encodeURIComponent(key) + '=' + createCookieOptions(options);
}
