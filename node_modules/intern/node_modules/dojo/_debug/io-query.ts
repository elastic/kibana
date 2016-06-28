/**
 * @module dojo/io-query
 *
 * This module defines query string processing functions.
 */

/**
 * Takes a name/value mapping object and returns a string representing a URL-encoded version of that object.
 * example:
 *     this object:
 *
 *     | {
 *     |     blah: "blah",
 *     |     multi: [
 *     |         "thud",
 *     |         "thonk"
 *     |     ]
 *     | };
 *
 *      yields the following query string:
 *
 *     | "blah=blah&multi=thud&multi=thonk"
 */
export function objectToQuery(map: {}): string {
	var query: string[] = [];
	var value: any;

	for (var key in map) {
		value = (<any> map)[key];

		key = encodeURIComponent(key);

		if (typeof value === 'boolean') {
			// Boolean properties are identified as true by their existence and do not have a corresponding
			// value
			value && query.push(key);
		}
		else if (Array.isArray(value)) {
			for (var i = 0, j = value.length; i < j; ++i) {
				query.push(key + '=' + encodeURIComponent(value[i]));
			}
		}
		else {
			query.push(key + '=' + encodeURIComponent(value));
		}
	}

	return query.join('&');
}
