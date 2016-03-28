'use strict'

// Import
const typeChecker = require('typechecker')
const eachr = require('eachr')

// Define
module.exports = function (opts, next, config = {}) {
	// Empty, set default
	if ( config.completionCallbackNames == null ) {
		config.completionCallbackNames = ['next']
	}

	// Not array, make array
	else if ( typeChecker.isArray(config.completionCallbackNames) === false ) {
		config.completionCallbackNames = [config.completionCallbackNames]
	}

	// Arguments
	if ( typeChecker.isFunction(opts) && next == null ) {
		next = opts
		opts = {}
	}
	else if ( !opts ) {
		opts = {}
	}

	// Completion callback
	if ( !next ) {
		// Cycle the completionCallbackNames to check if the completion callback name exists in opts
		// if it does, then use it as the next and delete it's value
		eachr(config.completionCallbackNames, function (completionCallbackName) {
			if ( typeof opts[completionCallbackName] !== 'undefined' ) {
				next = opts[completionCallbackName]
				delete opts[completionCallbackName]
				return false  // break
				// ^ why this only does the first, and not all, using the last, I don't know ...
				// can be changed in a future major update
			}
		})
	}

	// Ensure
	if ( !next )  next = null

	// Return
	return [opts, next]
}
