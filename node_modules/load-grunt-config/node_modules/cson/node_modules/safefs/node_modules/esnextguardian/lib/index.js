/* eslint no-console:0 no-var:0 */
'use strict'

// module.exports = require('esnextguardian')(__dirname + '/esnext/lib/index.js', __dirname + '/es5/lib/index.js')
module.exports = function (esnextModule, es5Module, _require) {
	var EARLIST_V8_MAJOR_VERSION_THAT_SUPPORTS_ESNEXT = 4

	// Check if no _require was provided, support it but discourage it
	if ( _require == null ) {
		// Output the warning if in debug mode
		if ( process.env.DEBUG_ESNEXTGUARDIAN ) {
			console.log('DEBUG: ' + new Error('The `require` argument should have been passed to ESNextGuardian for:\n' + esnextModule + '\n' + es5Module).stack)
		}

		// Support it by just using our require, which works, but doesn't have the same paths or configuration setup
		_require = require
	}

	// Check if a relative path was used instead of an absolute path
	if ( process.env.DEBUG_ESNEXTGUARDIAN && (esnextModule[0] === '.' || es5Module[0] === '.') ) {
		console.log('DEBUG: ' + new Error('Relative paths were passed to ESNextGuardian for:\n' + esnextModule + '\n' + es5Module).stack)
	}

	// If we always want to use the ESNext version, then do so
	if ( process.env.REQUIRE_ESNEXT ) {
		return _require(esnextModule)
	}
	// Otherwise if we always want to use the ES5 version (or if we are running on V8 <v4 as it doesn't support ES6), then do so:
	else if ( process.env.REQUIRE_ES5 || process.versions.v8 && process.versions.v8.split('.')[0] < EARLIST_V8_MAJOR_VERSION_THAT_SUPPORTS_ESNEXT ) {
		return _require(es5Module)
	}
	// Otherwise try to use the ESNext version
	else {
		try {
			return _require(esnextModule)
		}
		catch (e) {
			// And if it fails, output the reason why if debugging
			if ( process.env.DEBUG_ESNEXTGUARDIAN ) {
				console.log('DEBUG: ' + new Error('Downgraded ESNext to ES5:\n' + esnextModule + '\n' + es5Module + '\n' + e.stack).stack)
			}

			// Then just use the ES5 version
			return _require(es5Module)
		}
	}
}
