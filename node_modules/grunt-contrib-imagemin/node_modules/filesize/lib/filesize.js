/**
 * filesize
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2013 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/filesize.js/master/LICENSE>
 * @link http://filesizejs.com
 * @module filesize
 * @version 1.10.0
 */
( function ( global ) {
	"use strict";

	var base    = 10,
	    right   = /\.(.*)/,
	    bit     = /b$/,
	    bite    = /^B$/,
	    zero    = /^0$/,
	    options;

	options = {
		all : {
			increments : [["B", 1], ["kb", 125], ["kB", 1000], ["Mb", 125000], ["MB", 1000000], ["Gb", 125000000], ["GB", 1000000000], ["Tb", 125000000000], ["TB", 1000000000000], ["Pb", 125000000000000], ["PB", 1000000000000000]],
			nth        : 11
		},
		bitless : {
			increments : [["B", 1], ["kB", 1000], ["MB", 1000000], ["GB", 1000000000], ["TB", 1000000000000], ["PB", 1000000000000000]],
			nth        : 6
		}
	};

	/**
	 * filesize
	 *
	 * @param  {Mixed}   arg  String, Int or Float to transform
	 * @param  {Mixed}   pos  [Optional] Position to round to, defaults to 2 if shrt is ommitted, or `true` for shrthand output
	 * @param  {Boolean} bits [Optional] Determines if `bit` sizes are used for result calculation, default is true
	 * @return {String}       Readable file size String
	 */
	function filesize ( arg) {
		var result = "",
		    bits   = true,
		    skip   = false,
		    i, neg, num, pos, shrt, size, sizes, suffix, z;

		// Determining arguments
		if (arguments[3] !== undefined) {
			pos  = arguments[1];
			shrt = arguments[2];
			bits = arguments[3];
		}
		else {
			typeof arguments[1] === "boolean" ? shrt = arguments[1] : pos = arguments[1];

			if ( typeof arguments[2] === "boolean" ) {
				bits = arguments[2];
			}
		}

		if ( isNaN( arg ) || ( pos !== undefined && isNaN( pos ) ) ) {
			throw new Error("Invalid arguments");
		}

		shrt = ( shrt === true );
		bits = ( bits === true );
		pos  = shrt ? 1 : ( pos === undefined ? 2 : parseInt( pos, base ) );
		num  = Number( arg );
		neg  = ( num < 0 );

		// Flipping a negative number to determine the size
		if ( neg ) {
			num = -num;
		}

		// Zero is now a special case because bytes divide by 1
		if ( num === 0 ) {
			if ( shrt ) {
				result = "0";
			}
			else {
				result = "0 B";
			}
		}
		else {
			if ( bits ) {
				sizes = options.all.increments;
				i     = options.all.nth;
			}
			else {
				sizes = options.bitless.increments;
				i     = options.bitless.nth;
			}

			while ( i-- ) {
				size   = sizes[i][1];
				suffix = sizes[i][0];

				if ( num >= size ) {
					// Treating bytes as cardinal
					if ( bite.test( suffix ) ) {
						skip = true;
						pos  = 0;
					}

					result = ( num / size ).toFixed( pos );

					if ( !skip && shrt ) {
						if ( bits && bit.test( suffix ) ) {
							suffix = suffix.toLowerCase();
						}

						suffix = suffix.charAt( 0 );
						z      = right.exec( result );

						if ( suffix === "k" ) {
							suffix = "K";
						}

						if ( z !== null && z[1] !== undefined && zero.test( z[1] ) ) {
							result = parseInt( result, base );
						}

						result += suffix;
					}
					else if ( !shrt ) {
						result += " " + suffix;
					}
					break;
				}
			}
		}

		// Decorating a 'diff'
		if ( neg ) {
			result = "-" + result;
		}

		return result;
	}

	// CommonJS, AMD, script tag
	if ( typeof exports !== "undefined" ) {
		module.exports = filesize;
	}
	else if ( typeof define === "function" ) {
		define( function () {
			return filesize;
		});
	}
	else {
		global.filesize = filesize;
	}
})( this );
