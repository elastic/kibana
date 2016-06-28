/* @flow */

// Character positions
const INDEX_OF_FUNCTION_NAME = 9  // "function X", X is at index 9
const FIRST_UPPERCASE_INDEX_IN_ASCII = 65  // A is at index 65 in ASCII
const LAST_UPPERCASE_INDEX_IN_ASCII = 90   // Z is at index 90 in ASCII


// -----------------------------------
// Values

/**
 * Get the object type string
 * @param {any} value
 * @returns {string}
 */
export function getObjectType (value /* :mixed */) /* :string */ {
	return Object.prototype.toString.call(value)
}

/**
 * Checks to see if a value is an object
 * @param {any} value
 * @returns {boolean}
 */
export function isObject (value /* :any */ ) /* :boolean */ {
	// null and undefined are objects, hence the truthy check
	return value && typeof value === 'object'
}

/**
 * Checks to see if a value is an object and only an object
 * @param {any} value
 * @returns {boolean}
 */
export function isPlainObject (value /* :any */ ) /* :boolean */ {
	/* eslint no-proto:0 */
	return isObject(value) && value.__proto__ === Object.prototype
}

/**
 * Checks to see if a value is empty
 * @param {any} value
 * @returns {boolean}
 */
export function isEmpty (value /* :mixed */ ) /* :boolean */ {
	return value == null
}

/**
 * Is empty object
 * @param {any} value
 * @returns {boolean}
 */
export function isEmptyObject (value /* :Object */ ) /* :boolean */ {
	// We could use Object.keys, but this is more effecient
	for ( const key in value ) {
		if ( value.hasOwnProperty(key) ) {
			return false
		}
	}
	return true
}

/**
 * Is ES6+ class
 * @param {any} value
 * @returns {boolean}
 */
export function isNativeClass (value /* :mixed */ ) /* :boolean */ {
	// NOTE TO DEVELOPER: If any of this changes, isClass must also be updated
	return typeof value === 'function' && value.toString().indexOf('class') === 0
}

/**
 * Is Conventional Class
 * Looks for function with capital first letter MyClass
 * First letter is the 9th character
 * If changed, isClass must also be updated
 * @param {any} value
 * @returns {boolean}
 */
export function isConventionalClass (value /* :any */ ) /* :boolean */ {
	if ( typeof value !== 'function' )  return false
	const c = value.toString().charCodeAt(INDEX_OF_FUNCTION_NAME)
	return c >= FIRST_UPPERCASE_INDEX_IN_ASCII && c <= LAST_UPPERCASE_INDEX_IN_ASCII
}

// There use to be code here that checked for CoffeeScript's "function _Class" at index 0 (which was sound)
// But it would also check for Babel's __classCallCheck anywhere in the function, which wasn't sound
// as somewhere in the function, another class could be defined, which would provide a false positive
// So instead, proxied classes are ignored, as we can't guarantee their accuracy, would also be an ever growing set


// -----------------------------------
// Types

/**
 * Is Class
 * @param {any} value
 * @returns {boolean}
 */
export function isClass (value /* :any */ ) /* :boolean */ {
	// NOTE TO DEVELOPER: If any of this changes, you may also need to update isNativeClass
	if ( typeof value !== 'function' )  return false
	const s = value.toString()
	if ( s.indexOf('class') === 0 )  return true
	const c = s.charCodeAt(INDEX_OF_FUNCTION_NAME)
	return c >= FIRST_UPPERCASE_INDEX_IN_ASCII && c <= LAST_UPPERCASE_INDEX_IN_ASCII
}

/**
 * Checks to see if a value is an error
 * @param {any} value
 * @returns {boolean}
 */
export function isError (value /* :mixed */ ) /* :boolean */ {
	return value instanceof Error
}

/**
 * Checks to see if a value is a date
 * @param {any} value
 * @returns {boolean}
 */
export function isDate (value /* :mixed */ ) /* :boolean */ {
	return getObjectType(value) === '[object Date]'
}

/**
 * Checks to see if a value is an arguments object
 * @param {any} value
 * @returns {boolean}
 */
export function isArguments (value /* :mixed */ ) /* :boolean */ {
	return getObjectType(value) === '[object Arguments]'
}

/**
 * Checks to see if a value is a function
 * @param {any} value
 * @returns {boolean}
 */
export function isFunction (value /* :mixed */ ) /* :boolean */ {
	return getObjectType(value) === '[object Function]'
}

/**
 * Checks to see if a value is an regex
 * @param {any} value
 * @returns {boolean}
 */
export function isRegExp (value /* :mixed */ ) /* :boolean */ {
	return getObjectType(value) === '[object RegExp]'
}

/**
 * Checks to see if a value is an array
 * @param {any} value
 * @returns {boolean}
 */
export function isArray (value /* :mixed */ ) /* :boolean */ {
	return Array.isArray && Array.isArray(value) || getObjectType(value) === '[object Array]'
}

/**
 * Checks to see if a valule is a number
 * @param {any} value
 * @returns {boolean}
 */
export function isNumber (value /* :mixed */ ) /* :boolean */ {
	return typeof value === 'number' || getObjectType(value) === '[object Number]'
}

/**
 * Checks to see if a value is a string
 * @param {any} value
 * @returns {boolean}
 */
export function isString (value /* :mixed */ ) /* :boolean */ {
	return typeof value === 'string' || getObjectType(value) === '[object String]'
}

/**
 * Checks to see if a valule is a boolean
 * @param {any} value
 * @returns {boolean}
 */
export function isBoolean (value /* :mixed */ ) /* :boolean */ {
	return value === true || value === false || getObjectType(value) === '[object Boolean]'
}

/**
 * Checks to see if a value is null
 * @param {any} value
 * @returns {boolean}
 */
export function isNull (value /* :mixed */ ) /* :boolean */ {
	return value === null
}

/**
 * Checks to see if a value is undefined
 * @param {any} value
 * @returns {boolean}
 */
export function isUndefined (value /* :mixed */ ) /* :boolean */ {
	return typeof value === 'undefined'
}

/**
 * Checks to see if a value is a Map
 * @param {any} value
 * @returns {boolean}
 */
export function isMap (value /* :mixed */ ) /* :boolean */ {
	return getObjectType(value) === '[object Map]'
}

/**
 * Checks to see if a value is a WeakMap
 * @param {any} value
 * @returns {boolean}
 */
export function isWeakMap (value /* :mixed */ ) /* :boolean */ {
	return getObjectType(value) === '[object WeakMap]'
}


// -----------------------------------
// General

/**
 * The type mapping (type => method) to use for getType. Frozen.
 */
export const typeMap = Object.freeze({
	array: isArray,
	boolean: isBoolean,
	date: isDate,
	error: isError,
	class: isClass,
	function: isFunction,
	null: isNull,
	number: isNumber,
	regexp: isRegExp,
	string: isString,
	'undefined': isUndefined,
	map: isMap,
	weakmap: isWeakMap,
	object: isObject
})

/**
 * Get the type of the value in lowercase
 * @param {any} value
 * @param {Object} [_typeMap] a custom type map (type => method) in case you have new types you wish to use
 * @returns {?string}
 */
export function getType (value /* :mixed */, _typeMap /* :Object */ = typeMap) /* :?string */ {
	// Cycle through our type map
	for ( const key in _typeMap ) {
		if ( typeMap.hasOwnProperty(key) ) {
			if ( typeMap[key](value) ) {
				return key
			}
		}
	}

	// No type was successful
	return null
}
