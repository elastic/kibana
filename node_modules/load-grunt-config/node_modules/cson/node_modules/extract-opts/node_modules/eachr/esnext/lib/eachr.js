/* eslint no-cond-assign:0 */
'use strict'

// Import
const typeChecker = require('typechecker')

// Eachr
module.exports = function eachr (subject, callback) {
	// Handle
	if ( typeChecker.isArray(subject) ) {
		for ( let key = 0; key < subject.length; ++key ) {
			const value = subject[key]
			if ( callback.call(subject, value, key, subject) === false ) {
				break
			}
		}
	}
	else if ( typeChecker.isPlainObject(subject) ) {
		for ( const key in subject ) {
			if ( subject.hasOwnProperty(key) ) {
				const value = subject[key]
				if ( callback.call(subject, value, key, subject) === false ) {
					break
				}
			}
		}
	}
	else if ( typeChecker.isMap(subject) ) {
		const entries = subject.entries()
		let entry; while ( entry = entries.next().value ) {
			const [key, value] = entry  // destructuring
			if ( callback.call(subject, value, key, subject) === false ) {
				break
			}
		}
	}
	else {
		throw new Error('eachr does not know how to iterate what was passed to it')
	}

	// Return
	return subject
}
