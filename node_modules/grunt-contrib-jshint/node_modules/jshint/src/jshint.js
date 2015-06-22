/*!
 * JSHint, by JSHint Community.
 *
 * This file (and this file only) is licensed under the same slightly modified
 * MIT license that JSLint is. It stops evil-doers everywhere:
 *
 *	 Copyright (c) 2002 Douglas Crockford  (www.JSLint.com)
 *
 *	 Permission is hereby granted, free of charge, to any person obtaining
 *	 a copy of this software and associated documentation files (the "Software"),
 *	 to deal in the Software without restriction, including without limitation
 *	 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *	 and/or sell copies of the Software, and to permit persons to whom
 *	 the Software is furnished to do so, subject to the following conditions:
 *
 *	 The above copyright notice and this permission notice shall be included
 *	 in all copies or substantial portions of the Software.
 *
 *	 The Software shall be used for Good, not Evil.
 *
 *	 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *	 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *	 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *	 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *	 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *	 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *	 DEALINGS IN THE SOFTWARE.
 *
 */

/*jshint quotmark:double */
/*global console:true */
/*exported console */

var _        = require("underscore");
var events   = require("events");
var vars     = require("./vars.js");
var messages = require("./messages.js");
var Lexer    = require("./lex.js").Lexer;
var reg      = require("./reg.js");
var state    = require("./state.js").state;
var style    = require("./style.js");

// We need this module here because environments such as IE and Rhino
// don't necessarilly expose the 'console' API and browserify uses
// it to log things. It's a sad state of affair, really.
var console = require("console-browserify");

// We build the application inside a function so that we produce only a singleton
// variable. That function will be invoked immediately, and its return value is
// the JSHINT function itself.

var JSHINT = (function () {
	"use strict";

	var anonname, // The guessed name for anonymous functions.
		api, // Extension API

		// These are operators that should not be used with the ! operator.
		bang = {
			"<"  : true,
			"<=" : true,
			"==" : true,
			"===": true,
			"!==": true,
			"!=" : true,
			">"  : true,
			">=" : true,
			"+"  : true,
			"-"  : true,
			"*"  : true,
			"/"  : true,
			"%"  : true
		},

		// These are the JSHint boolean options.
		boolOptions = {
			asi         : true, // if automatic semicolon insertion should be tolerated
			bitwise     : true, // if bitwise operators should not be allowed
			boss        : true, // if advanced usage of assignments should be allowed
			browser     : true, // if the standard browser globals should be predefined
			camelcase   : true, // if identifiers should be required in camel case
			couch       : true, // if CouchDB globals should be predefined
			curly       : true, // if curly braces around all blocks should be required
			debug       : true, // if debugger statements should be allowed
			devel       : true, // if logging globals should be predefined (console, alert, etc.)
			dojo        : true, // if Dojo Toolkit globals should be predefined
			eqeqeq      : true, // if === should be required
			eqnull      : true, // if == null comparisons should be tolerated
			notypeof    : true, // if should report typos in typeof comparisons
			es3         : true, // if ES3 syntax should be allowed
			es5         : true, // if ES5 syntax should be allowed (is now set per default)
			esnext      : true, // if es.next specific syntax should be allowed
			moz         : true, // if mozilla specific syntax should be allowed
			evil        : true, // if eval should be allowed
			expr        : true, // if ExpressionStatement should be allowed as Programs
			forin       : true, // if for in statements must filter
			funcscope   : true, // if only function scope should be used for scope tests
			gcl         : true, // if JSHint should be compatible with Google Closure Linter
			globalstrict: true, // if global "use strict"; should be allowed (also enables 'strict')
			immed       : true, // if immediate invocations must be wrapped in parens
			iterator    : true, // if the `__iterator__` property should be allowed
			jquery      : true, // if jQuery globals should be predefined
			lastsemic   : true, // if semicolons may be ommitted for the trailing
			                    // statements inside of a one-line blocks.
			laxbreak    : true, // if line breaks should not be checked
			laxcomma    : true, // if line breaks should not be checked around commas
			loopfunc    : true, // if functions should be allowed to be defined within
			                    // loops
			mootools    : true, // if MooTools globals should be predefined
			multistr    : true, // allow multiline strings
			freeze      : true, // if modifying native object prototypes should be disallowed
			newcap      : true, // if constructor names must be capitalized
			noarg       : true, // if arguments.caller and arguments.callee should be
			                    // disallowed
			node        : true, // if the Node.js environment globals should be
			                    // predefined
			noempty     : true, // if empty blocks should be disallowed
			nonew       : true, // if using `new` for side-effects should be disallowed
			nonstandard : true, // if non-standard (but widely adopted) globals should
			                    // be predefined
			nomen       : true, // if names should be checked
			onevar      : true, // if only one var statement per function should be
			                    // allowed
			passfail    : true, // if the scan should stop on first error
			phantom     : true, // if PhantomJS symbols should be allowed
			plusplus    : true, // if increment/decrement should not be allowed
			proto       : true, // if the `__proto__` property should be allowed
			prototypejs : true, // if Prototype and Scriptaculous globals should be
			                    // predefined
			rhino       : true, // if the Rhino environment globals should be predefined
			shelljs     : true, // if ShellJS globals should be predefined
			typed       : true, // if typed array globals should be predefined
			undef       : true, // if variables should be declared before used
			scripturl   : true, // if script-targeted URLs should be tolerated
			shadow      : true, // if variable shadowing should be tolerated
			smarttabs   : true, // if smarttabs should be tolerated
			                    // (http://www.emacswiki.org/emacs/SmartTabs)
			strict      : true, // require the "use strict"; pragma
			sub         : true, // if all forms of subscript notation are tolerated
			supernew    : true, // if `new function () { ... };` and `new Object;`
			                    // should be tolerated
			trailing    : true, // if trailing whitespace rules apply
			validthis   : true, // if 'this' inside a non-constructor function is valid.
			                    // This is a function scoped option only.
			withstmt    : true, // if with statements should be allowed
			white       : true, // if strict whitespace rules apply
			worker      : true, // if Web Worker script symbols should be allowed
			wsh         : true, // if the Windows Scripting Host environment globals
			                    // should be predefined
			yui         : true, // YUI variables should be predefined

			// Obsolete options
			onecase     : true, // if one case switch statements should be allowed
			regexp      : true, // if the . should not be allowed in regexp literals
			regexdash   : true  // if unescaped first/last dash (-) inside brackets
			                    // should be tolerated
		},

		// These are the JSHint options that can take any value
		// (we use this object to detect invalid options)
		valOptions = {
			maxlen       : false,
			indent       : false,
			maxerr       : false,
			predef       : false, //predef is deprecated and being replaced by globals
			globals      : false,
			quotmark     : false, //'single'|'double'|true
			scope        : false,
			maxstatements: false, // {int} max statements per function
			maxdepth     : false, // {int} max nested block depth per function
			maxparams    : false, // {int} max params per function
			maxcomplexity: false, // {int} max cyclomatic complexity per function
			unused       : true,  // warn if variables are unused. Available options:
			                      //   false    - don't check for unused variables
			                      //   true     - "vars" + check last function param
			                      //   "vars"   - skip checking unused function params
			                      //   "strict" - "vars" + check all function params
			latedef      : false, // warn if the variable is used before its definition
			                      //   false    - don't emit any warnings
			                      //   true     - warn if any variable is used before its definition
			                      //   "nofunc" - warn for any variable but function declarations
			ignore       : false  // start/end ignoring lines of code, bypassing the lexer
			                      //   start    - start ignoring lines, including the current line
			                      //   end      - stop ignoring lines, starting on the next line
			                      //   line     - ignore warnings / errors for just a single line
			                      //              (this option does not bypass the lexer)
		},

		// These are JSHint boolean options which are shared with JSLint
		// where the definition in JSHint is opposite JSLint
		invertedOptions = {
			bitwise : true,
			forin   : true,
			newcap  : true,
			nomen   : true,
			plusplus: true,
			regexp  : true,
			undef   : true,
			white   : true,

			// Inverted and renamed, use JSHint name here
			eqeqeq  : true,
			onevar  : true,
			strict  : true
		},

		// These are JSHint boolean options which are shared with JSLint
		// where the name has been changed but the effect is unchanged
		renamedOptions = {
			eqeq   : "eqeqeq",
			vars   : "onevar",
			windows: "wsh",
			sloppy : "strict"
		},

		declared, // Globals that were declared using /*global ... */ syntax.
		exported, // Variables that are used outside of the current file.

		functionicity = [
			"closure", "exception", "global", "label",
			"outer", "unused", "var"
		],

		funct, // The current function
		functions, // All of the functions

		global, // The global scope
		implied, // Implied globals
		inblock,
		indent,
		lookahead,
		lex,
		member,
		membersOnly,
		noreach,
		predefined,		// Global variables defined by option

		scope,  // The current scope
		stack,
		unuseds,
		urls,
		warnings,

		extraModules = [],
		emitter = new events.EventEmitter();

	function checkOption(name, t) {
		name = name.trim();

		if (/^[+-]W\d{3}$/g.test(name)) {
			return true;
		}

		if (valOptions[name] === undefined && boolOptions[name] === undefined) {
			if (t.type !== "jslint") {
				error("E001", t, name);
				return false;
			}
		}

		return true;
	}

	function isString(obj) {
		return Object.prototype.toString.call(obj) === "[object String]";
	}

	function isIdentifier(tkn, value) {
		if (!tkn)
			return false;

		if (!tkn.identifier || tkn.value !== value)
			return false;

		return true;
	}

	function isReserved(token) {
		if (!token.reserved) {
			return false;
		}
		var meta = token.meta;

		if (meta && meta.isFutureReservedWord && state.option.inES5()) {
			// ES3 FutureReservedWord in an ES5 environment.
			if (!meta.es5) {
				return false;
			}

			// Some ES5 FutureReservedWord identifiers are active only
			// within a strict mode environment.
			if (meta.strictOnly) {
				if (!state.option.strict && !state.directive["use strict"]) {
					return false;
				}
			}

			if (token.isProperty) {
				return false;
			}
		}

		return true;
	}

	function supplant(str, data) {
		return str.replace(/\{([^{}]*)\}/g, function (a, b) {
			var r = data[b];
			return typeof r === "string" || typeof r === "number" ? r : a;
		});
	}

	function combine(t, o) {
		var n;
		for (n in o) {
			if (_.has(o, n) && !_.has(JSHINT.blacklist, n)) {
				t[n] = o[n];
			}
		}
	}

	function updatePredefined() {
		Object.keys(JSHINT.blacklist).forEach(function (key) {
			delete predefined[key];
		});
	}

	function assume() {
		if (state.option.es5) {
			warning("I003");
		}
		if (state.option.couch) {
			combine(predefined, vars.couch);
		}

		if (state.option.rhino) {
			combine(predefined, vars.rhino);
		}

		if (state.option.shelljs) {
			combine(predefined, vars.shelljs);
			combine(predefined, vars.node);
		}
		if (state.option.typed) {
			combine(predefined, vars.typed);
		}

		if (state.option.phantom) {
			combine(predefined, vars.phantom);
		}

		if (state.option.prototypejs) {
			combine(predefined, vars.prototypejs);
		}

		if (state.option.node) {
			combine(predefined, vars.node);
			combine(predefined, vars.typed);
		}

		if (state.option.devel) {
			combine(predefined, vars.devel);
		}

		if (state.option.dojo) {
			combine(predefined, vars.dojo);
		}

		if (state.option.browser) {
			combine(predefined, vars.browser);
			combine(predefined, vars.typed);
		}

		if (state.option.nonstandard) {
			combine(predefined, vars.nonstandard);
		}

		if (state.option.jquery) {
			combine(predefined, vars.jquery);
		}

		if (state.option.mootools) {
			combine(predefined, vars.mootools);
		}

		if (state.option.worker) {
			combine(predefined, vars.worker);
		}

		if (state.option.wsh) {
			combine(predefined, vars.wsh);
		}

		if (state.option.globalstrict && state.option.strict !== false) {
			state.option.strict = true;
		}

		if (state.option.yui) {
			combine(predefined, vars.yui);
		}

		// Let's assume that chronologically ES3 < ES5 < ES6/ESNext < Moz

		state.option.inMoz = function (strict) {
			if (strict) {
				return state.option.moz && !state.option.esnext;
			}
			return state.option.moz;
		};

		state.option.inESNext = function (strict) {
			if (strict) {
				return !state.option.moz && state.option.esnext;
			}
			return state.option.moz || state.option.esnext;
		};

		state.option.inES5 = function (/* strict */) {
			return !state.option.es3;
		};

		state.option.inES3 = function (strict) {
			if (strict) {
				return !state.option.moz && !state.option.esnext && state.option.es3;
			}
			return state.option.es3;
		};
	}

	// Produce an error warning.
	function quit(code, line, chr) {
		var percentage = Math.floor((line / state.lines.length) * 100);
		var message = messages.errors[code].desc;

		throw {
			name: "JSHintError",
			line: line,
			character: chr,
			message: message + " (" + percentage + "% scanned).",
			raw: message,
			code: code
		};
	}

	function isundef(scope, code, token, a) {
		return JSHINT.undefs.push([scope, code, token, a]);
	}

	function warning(code, t, a, b, c, d) {
		var ch, l, w, msg;

		if (/^W\d{3}$/.test(code)) {
			if (state.ignored[code])
				return;

			msg = messages.warnings[code];
		} else if (/E\d{3}/.test(code)) {
			msg = messages.errors[code];
		} else if (/I\d{3}/.test(code)) {
			msg = messages.info[code];
		}

		t = t || state.tokens.next;
		if (t.id === "(end)") {  // `~
			t = state.tokens.curr;
		}

		l = t.line || 0;
		ch = t.from || 0;

		w = {
			id: "(error)",
			raw: msg.desc,
			code: msg.code,
			evidence: state.lines[l - 1] || "",
			line: l,
			character: ch,
			scope: JSHINT.scope,
			a: a,
			b: b,
			c: c,
			d: d
		};

		w.reason = supplant(msg.desc, w);
		JSHINT.errors.push(w);

		if (state.option.passfail) {
			quit("E042", l, ch);
		}

		warnings += 1;
		if (warnings >= state.option.maxerr) {
			quit("E043", l, ch);
		}

		return w;
	}

	function warningAt(m, l, ch, a, b, c, d) {
		return warning(m, {
			line: l,
			from: ch
		}, a, b, c, d);
	}

	function error(m, t, a, b, c, d) {
		warning(m, t, a, b, c, d);
	}

	function errorAt(m, l, ch, a, b, c, d) {
		return error(m, {
			line: l,
			from: ch
		}, a, b, c, d);
	}

	// Tracking of "internal" scripts, like eval containing a static string
	function addInternalSrc(elem, src) {
		var i;
		i = {
			id: "(internal)",
			elem: elem,
			value: src
		};
		JSHINT.internals.push(i);
		return i;
	}

	function addlabel(t, type, tkn, islet) {
		// Define t in the current function in the current scope.
		if (type === "exception") {
			if (_.has(funct["(context)"], t)) {
				if (funct[t] !== true && !state.option.node) {
					warning("W002", state.tokens.next, t);
				}
			}
		}

		if (_.has(funct, t) && !funct["(global)"]) {
			if (funct[t] === true) {
				if (state.option.latedef) {
					if ((state.option.latedef === true && _.contains([funct[t], type], "unction")) ||
							!_.contains([funct[t], type], "unction")) {
						warning("W003", state.tokens.next, t);
					}
				}
			} else {
				if (!state.option.shadow && type !== "exception" ||
							(funct["(blockscope)"].getlabel(t))) {
					warning("W004", state.tokens.next, t);
				}
			}
		}

		// a double definition of a let variable in same block throws a TypeError
		if (funct["(blockscope)"] && funct["(blockscope)"].current.has(t)) {
			error("E044", state.tokens.next, t);
		}

		// if the identifier is from a let, adds it only to the current blockscope
		if (islet) {
			funct["(blockscope)"].current.add(t, type, state.tokens.curr);
		} else {

			funct[t] = type;

			if (tkn) {
				funct["(tokens)"][t] = tkn;
			}

			if (funct["(global)"]) {
				global[t] = funct;
				if (_.has(implied, t)) {
					if (state.option.latedef) {
						if ((state.option.latedef === true && _.contains([funct[t], type], "unction")) ||
								!_.contains([funct[t], type], "unction")) {
							warning("W003", state.tokens.next, t);
						}
					}

					delete implied[t];
				}
			} else {
				scope[t] = funct;
			}
		}
	}

	function doOption() {
		var nt = state.tokens.next;
		var body = nt.body.split(",").map(function (s) { return s.trim(); });
		var predef = {};

		if (nt.type === "globals") {
			body.forEach(function (g) {
				g = g.split(":");
				var key = (g[0] || "").trim();
				var val = (g[1] || "").trim();

				if (key.charAt(0) === "-") {
					key = key.slice(1);
					val = false;

					JSHINT.blacklist[key] = key;
					updatePredefined();
				} else {
					predef[key] = (val === "true");
				}
			});

			combine(predefined, predef);

			for (var key in predef) {
				if (_.has(predef, key)) {
					declared[key] = nt;
				}
			}
		}

		if (nt.type === "exported") {
			body.forEach(function (e) {
				exported[e] = true;
			});
		}

		if (nt.type === "members") {
			membersOnly = membersOnly || {};

			body.forEach(function (m) {
				var ch1 = m.charAt(0);
				var ch2 = m.charAt(m.length - 1);

				if (ch1 === ch2 && (ch1 === "\"" || ch1 === "'")) {
					m = m
						.substr(1, m.length - 2)
						.replace("\\b", "\b")
						.replace("\\t", "\t")
						.replace("\\n", "\n")
						.replace("\\v", "\v")
						.replace("\\f", "\f")
						.replace("\\r", "\r")
						.replace("\\\\", "\\")
						.replace("\\\"", "\"");
				}

				membersOnly[m] = false;
			});
		}

		var numvals = [
			"maxstatements",
			"maxparams",
			"maxdepth",
			"maxcomplexity",
			"maxerr",
			"maxlen",
			"indent"
		];

		if (nt.type === "jshint" || nt.type === "jslint") {
			body.forEach(function (g) {
				g = g.split(":");
				var key = (g[0] || "").trim();
				var val = (g[1] || "").trim();

				if (!checkOption(key, nt)) {
					return;
				}

				if (numvals.indexOf(key) >= 0) {

					// GH988 - numeric options can be disabled by setting them to `false`
					if (val !== "false") {
						val = +val;

						if (typeof val !== "number" || !isFinite(val) || val <= 0 || Math.floor(val) !== val) {
							error("E032", nt, g[1].trim());
							return;
						}

						if (key === "indent") {
							state.option["(explicitIndent)"] = true;
						}
						state.option[key] = val;
					} else {
						if (key === "indent") {
							state.option["(explicitIndent)"] = false;
						} else {
							state.option[key] = false;
						}
					}

					return;
				}

				if (key === "validthis") {
					// `validthis` is valid only within a function scope.
					if (funct["(global)"]) {
						error("E009");
					} else {
						if (val === "true" || val === "false") {
							state.option.validthis = (val === "true");
						} else {
							error("E002", nt);
						}
					}
					return;
				}

				if (key === "quotmark") {
					switch (val) {
					case "true":
					case "false":
						state.option.quotmark = (val === "true");
						break;
					case "double":
					case "single":
						state.option.quotmark = val;
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				if (key === "unused") {
					switch (val) {
					case "true":
						state.option.unused = true;
						break;
					case "false":
						state.option.unused = false;
						break;
					case "vars":
					case "strict":
						state.option.unused = val;
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				if (key === "latedef") {
					switch (val) {
					case "true":
						state.option.latedef = true;
						break;
					case "false":
						state.option.latedef = false;
						break;
					case "nofunc":
						state.option.latedef = "nofunc";
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				if (key === "ignore") {
					switch (val) {
					case "start":
						state.ignoreLinterErrors = true;
						break;
					case "end":
						state.ignoreLinterErrors = false;
						break;
					case "line":
						// Any errors or warnings that happened on the current line, make them go away.
						JSHINT.errors = _.reject(JSHINT.errors, function (error) {
							// nt.line returns to the current line
							return error.line === nt.line;
						});
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				var match = /^([+-])(W\d{3})$/g.exec(key);
				if (match) {
					// ignore for -W..., unignore for +W...
					state.ignored[match[2]] = (match[1] === "-");
					return;
				}

				var tn;
				if (val === "true" || val === "false") {
					if (nt.type === "jslint") {
						tn = renamedOptions[key] || key;
						state.option[tn] = (val === "true");

						if (invertedOptions[tn] !== undefined) {
							state.option[tn] = !state.option[tn];
						}
					} else {
						state.option[key] = (val === "true");
					}

					if (key === "newcap") {
						state.option["(explicitNewcap)"] = true;
					}
					return;
				}

				error("E002", nt);
			});

			assume();
		}
	}

	// We need a peek function. If it has an argument, it peeks that much farther
	// ahead. It is used to distinguish
	//	   for ( var i in ...
	// from
	//	   for ( var i = ...

	function peek(p) {
		var i = p || 0, j = 0, t;

		while (j <= i) {
			t = lookahead[j];
			if (!t) {
				t = lookahead[j] = lex.token();
			}
			j += 1;
		}
		return t;
	}

	// Produce the next token. It looks for programming errors.

	function advance(id, t) {
		switch (state.tokens.curr.id) {
		case "(number)":
			if (state.tokens.next.id === ".") {
				warning("W005", state.tokens.curr);
			}
			break;
		case "-":
			if (state.tokens.next.id === "-" || state.tokens.next.id === "--") {
				warning("W006");
			}
			break;
		case "+":
			if (state.tokens.next.id === "+" || state.tokens.next.id === "++") {
				warning("W007");
			}
			break;
		}

		if (state.tokens.curr.type === "(string)" || state.tokens.curr.identifier) {
			anonname = state.tokens.curr.value;
		}

		if (id && state.tokens.next.id !== id) {
			if (t) {
				if (state.tokens.next.id === "(end)") {
					error("E019", t, t.id);
				} else {
					error("E020", state.tokens.next, id, t.id, t.line, state.tokens.next.value);
				}
			} else if (state.tokens.next.type !== "(identifier)" || state.tokens.next.value !== id) {
				warning("W116", state.tokens.next, id, state.tokens.next.value);
			}
		}

		state.tokens.prev = state.tokens.curr;
		state.tokens.curr = state.tokens.next;
		for (;;) {
			state.tokens.next = lookahead.shift() || lex.token();

			if (!state.tokens.next) { // No more tokens left, give up
				quit("E041", state.tokens.curr.line);
			}

			if (state.tokens.next.id === "(end)" || state.tokens.next.id === "(error)") {
				return;
			}

			if (state.tokens.next.check) {
				state.tokens.next.check();
			}

			if (state.tokens.next.isSpecial) {
				doOption();
			} else {
				if (state.tokens.next.id !== "(endline)") {
					break;
				}
			}
		}
	}

	function isInfix(token) {
		return token.infix || (!token.identifier && !!token.led);
	}

	function isEndOfExpr() {
		var curr = state.tokens.curr;
		var next = state.tokens.next;
		if (next.id === ";" || next.id === "}" || next.id === ":") {
			return true;
		}
		if (isInfix(next) === isInfix(curr) || (curr.id === "yield" && state.option.inMoz(true))) {
			return curr.line !== next.line;
		}
		return false;
	}

	// This is the heart of JSHINT, the Pratt parser. In addition to parsing, it
	// is looking for ad hoc lint patterns. We add .fud to Pratt's model, which is
	// like .nud except that it is only used on the first token of a statement.
	// Having .fud makes it much easier to define statement-oriented languages like
	// JavaScript. I retained Pratt's nomenclature.

	// .nud  Null denotation
	// .fud  First null denotation
	// .led  Left denotation
	//  lbp  Left binding power
	//  rbp  Right binding power

	// They are elements of the parsing method called Top Down Operator Precedence.

	function expression(rbp, initial) {
		var left, isArray = false, isObject = false, isLetExpr = false;

		// if current expression is a let expression
		if (!initial && state.tokens.next.value === "let" && peek(0).value === "(") {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.next, "let expressions");
			}
			isLetExpr = true;
			// create a new block scope we use only for the current expression
			funct["(blockscope)"].stack();
			advance("let");
			advance("(");
			state.syntax["let"].fud.call(state.syntax["let"].fud, false);
			advance(")");
		}

		if (state.tokens.next.id === "(end)")
			error("E006", state.tokens.curr);

		advance();

		if (initial) {
			anonname = "anonymous";
			funct["(verb)"] = state.tokens.curr.value;
		}

		if (initial === true && state.tokens.curr.fud) {
			left = state.tokens.curr.fud();
		} else {
			if (state.tokens.curr.nud) {
				left = state.tokens.curr.nud();
			} else {
				error("E030", state.tokens.curr, state.tokens.curr.id);
			}

			while (rbp < state.tokens.next.lbp && !isEndOfExpr()) {
				isArray = state.tokens.curr.value === "Array";
				isObject = state.tokens.curr.value === "Object";

				// #527, new Foo.Array(), Foo.Array(), new Foo.Object(), Foo.Object()
				// Line breaks in IfStatement heads exist to satisfy the checkJSHint
				// "Line too long." error.
				if (left && (left.value || (left.first && left.first.value))) {
					// If the left.value is not "new", or the left.first.value is a "."
					// then safely assume that this is not "new Array()" and possibly
					// not "new Object()"...
					if (left.value !== "new" ||
					  (left.first && left.first.value && left.first.value === ".")) {
						isArray = false;
						// ...In the case of Object, if the left.value and state.tokens.curr.value
						// are not equal, then safely assume that this not "new Object()"
						if (left.value !== state.tokens.curr.value) {
							isObject = false;
						}
					}
				}

				advance();

				if (isArray && state.tokens.curr.id === "(" && state.tokens.next.id === ")") {
					warning("W009", state.tokens.curr);
				}

				if (isObject && state.tokens.curr.id === "(" && state.tokens.next.id === ")") {
					warning("W010", state.tokens.curr);
				}

				if (left && state.tokens.curr.led) {
					left = state.tokens.curr.led(left);
				} else {
					error("E033", state.tokens.curr, state.tokens.curr.id);
				}
			}
		}
		if (isLetExpr) {
			funct["(blockscope)"].unstack();
		}
		return left;
	}


// Functions for conformance of style.

	function adjacent(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white) {
			if (left.character !== right.from && left.line === right.line) {
				left.from += (left.character - left.from);
				warning("W011", left, left.value);
			}
		}
	}

	function nobreak(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white && (left.character !== right.from || left.line !== right.line)) {
			warning("W012", right, right.value);
		}
	}

	function nospace(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white && !left.comment) {
			if (left.line === right.line) {
				adjacent(left, right);
			}
		}
	}

	function nonadjacent(left, right) {
		if (state.option.white) {
			left = left || state.tokens.curr;
			right = right || state.tokens.next;

			if (left.value === ";" && right.value === ";") {
				return;
			}

			if (left.line === right.line && left.character === right.from) {
				left.from += (left.character - left.from);
				warning("W013", left, left.value);
			}
		}
	}

	function nobreaknonadjacent(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (!state.option.laxbreak && left.line !== right.line) {
			warning("W014", right, right.value);
		} else if (state.option.white) {
			left = left || state.tokens.curr;
			right = right || state.tokens.next;
			if (left.character === right.from) {
				left.from += (left.character - left.from);
				warning("W013", left, left.value);
			}
		}
	}

	function indentation(bias) {
		if (!state.option.white && !state.option["(explicitIndent)"]) {
			return;
		}

		if (state.tokens.next.id === "(end)") {
			return;
		}

		var i = indent + (bias || 0);
		if (state.tokens.next.from !== i) {
			warning("W015", state.tokens.next, state.tokens.next.value, i, state.tokens.next.from);
		}
	}

	function nolinebreak(t) {
		t = t || state.tokens.curr;
		if (t.line !== state.tokens.next.line) {
			warning("E022", t, t.value);
		}
	}

	function nobreakcomma(left, right) {
		if (left.line !== right.line) {
			if (!state.option.laxcomma) {
				if (comma.first) {
					warning("I001");
					comma.first = false;
				}
				warning("W014", left, right.value);
			}
		} else if (!left.comment && left.character !== right.from && state.option.white) {
			left.from += (left.character - left.from);
			warning("W011", left, left.value);
		}
	}

	function comma(opts) {
		opts = opts || {};

		if (!opts.peek) {
			nobreakcomma(state.tokens.curr, state.tokens.next);
			advance(",");
		} else {
			nobreakcomma(state.tokens.prev, state.tokens.curr);
		}

		// TODO: This is a temporary solution to fight against false-positives in
		// arrays and objects with trailing commas (see GH-363). The best solution
		// would be to extract all whitespace rules out of parser.

		if (state.tokens.next.value !== "]" && state.tokens.next.value !== "}") {
			nonadjacent(state.tokens.curr, state.tokens.next);
		}

		if (state.tokens.next.identifier && !(opts.property && state.option.inES5())) {
			// Keywords that cannot follow a comma operator.
			switch (state.tokens.next.value) {
			case "break":
			case "case":
			case "catch":
			case "continue":
			case "default":
			case "do":
			case "else":
			case "finally":
			case "for":
			case "if":
			case "in":
			case "instanceof":
			case "return":
			case "switch":
			case "throw":
			case "try":
			case "var":
			case "let":
			case "while":
			case "with":
				error("E024", state.tokens.next, state.tokens.next.value);
				return false;
			}
		}

		if (state.tokens.next.type === "(punctuator)") {
			switch (state.tokens.next.value) {
			case "}":
			case "]":
			case ",":
				if (opts.allowTrailing) {
					return true;
				}

				/* falls through */
			case ")":
				error("E024", state.tokens.next, state.tokens.next.value);
				return false;
			}
		}
		return true;
	}

	// Functional constructors for making the symbols that will be inherited by
	// tokens.

	function symbol(s, p) {
		var x = state.syntax[s];
		if (!x || typeof x !== "object") {
			state.syntax[s] = x = {
				id: s,
				lbp: p,
				value: s
			};
		}
		return x;
	}

	function delim(s) {
		return symbol(s, 0);
	}

	function stmt(s, f) {
		var x = delim(s);
		x.identifier = x.reserved = true;
		x.fud = f;
		return x;
	}

	function blockstmt(s, f) {
		var x = stmt(s, f);
		x.block = true;
		return x;
	}

	function reserveName(x) {
		var c = x.id.charAt(0);
		if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
			x.identifier = x.reserved = true;
		}
		return x;
	}

	function prefix(s, f) {
		var x = symbol(s, 150);
		reserveName(x);
		x.nud = (typeof f === "function") ? f : function () {
			this.right = expression(150);
			this.arity = "unary";
			if (this.id === "++" || this.id === "--") {
				if (state.option.plusplus) {
					warning("W016", this, this.id);
				} else if ((!this.right.identifier || isReserved(this.right)) &&
						this.right.id !== "." && this.right.id !== "[") {
					warning("W017", this);
				}
			}
			return this;
		};
		return x;
	}

	function type(s, f) {
		var x = delim(s);
		x.type = s;
		x.nud = f;
		return x;
	}

	function reserve(name, func) {
		var x = type(name, func);
		x.identifier = true;
		x.reserved = true;
		return x;
	}

	function FutureReservedWord(name, meta) {
		var x = type(name, (meta && meta.nud) || function () {
			return this;
		});

		meta = meta || {};
		meta.isFutureReservedWord = true;

		x.value = name;
		x.identifier = true;
		x.reserved = true;
		x.meta = meta;

		return x;
	}

	function reservevar(s, v) {
		return reserve(s, function () {
			if (typeof v === "function") {
				v(this);
			}
			return this;
		});
	}

	function infix(s, f, p, w) {
		var x = symbol(s, p);
		reserveName(x);
		x.infix = true;
		x.led = function (left) {
			if (!w) {
				nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
				nonadjacent(state.tokens.curr, state.tokens.next);
			}
			if (s === "in" && left.id === "!") {
				warning("W018", left, "!");
			}
			if (typeof f === "function") {
				return f(left, this);
			} else {
				this.left = left;
				this.right = expression(p);
				return this;
			}
		};
		return x;
	}


	function application(s) {
		var x = symbol(s, 42);

		x.led = function (left) {
			if (!state.option.inESNext()) {
				warning("W104", state.tokens.curr, "arrow function syntax (=>)");
			}

			nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);

			this.left = left;
			this.right = doFunction(undefined, undefined, false, left);
			return this;
		};
		return x;
	}

	function relation(s, f) {
		var x = symbol(s, 100);

		x.led = function (left) {
			nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);
			var right = expression(100);

			if (isIdentifier(left, "NaN") || isIdentifier(right, "NaN")) {
				warning("W019", this);
			} else if (f) {
				f.apply(this, [left, right]);
			}

			if (!left || !right) {
				quit("E041", state.tokens.curr.line);
			}

			if (left.id === "!") {
				warning("W018", left, "!");
			}

			if (right.id === "!") {
				warning("W018", right, "!");
			}

			this.left = left;
			this.right = right;
			return this;
		};
		return x;
	}

	function isPoorRelation(node) {
		return node &&
			  ((node.type === "(number)" && +node.value === 0) ||
			   (node.type === "(string)" && node.value === "") ||
			   (node.type === "null" && !state.option.eqnull) ||
				node.type === "true" ||
				node.type === "false" ||
				node.type === "undefined");
	}

	// Checks whether the 'typeof' operator is used with the correct
	// value. For docs on 'typeof' see:
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof

	function isTypoTypeof(left, right) {
		if (state.option.notypeof)
			return false;

		if (!left || !right)
			return false;

		var values = [
			"undefined", "object", "boolean", "number",
			"string", "function", "xml", "object"
		];

		if (right.type === "(identifier)" && right.value === "typeof" && left.type === "(string)")
			return !_.contains(values, left.value);

		return false;
	}

	function findNativePrototype(left) {
		var natives = [
			"Array", "ArrayBuffer", "Boolean", "Collator", "DataView", "Date",
			"DateTimeFormat", "Error", "EvalError", "Float32Array", "Float64Array",
			"Function", "Infinity", "Intl", "Int16Array", "Int32Array", "Int8Array",
			"Iterator", "Number", "NumberFormat", "Object", "RangeError",
			"ReferenceError", "RegExp", "StopIteration", "String", "SyntaxError",
			"TypeError", "Uint16Array", "Uint32Array", "Uint8Array", "Uint8ClampedArray",
			"URIError"
		];

		function walkPrototype(obj) {
			if (typeof obj !== "object") return;
			return obj.right === "prototype" ? obj : walkPrototype(obj.left);
		}

		function walkNative(obj) {
			while (!obj.identifier && typeof obj.left === "object")
			  obj = obj.left;

			if (obj.identifier && natives.indexOf(obj.value) >= 0)
			  return obj.value;
		}

		var prototype = walkPrototype(left);
		if (prototype) return walkNative(prototype);
	}

	function assignop(s, f, p) {
		var x = infix(s, typeof f === "function" ? f : function (left, that) {
			that.left = left;

			if (left) {
				if (state.option.freeze) {
					var nativeObject = findNativePrototype(left);
					if (nativeObject)
						warning("W121", left, nativeObject);
				}

				if (predefined[left.value] === false &&
						scope[left.value]["(global)"] === true) {
					warning("W020", left);
				} else if (left["function"]) {
					warning("W021", left, left.value);
				}

				if (funct[left.value] === "const") {
					error("E013", left, left.value);
				}

				if (left.id === ".") {
					if (!left.left) {
						warning("E031", that);
					} else if (left.left.value === "arguments" && !state.directive["use strict"]) {
						warning("E031", that);
					}

					that.right = expression(10);
					return that;
				} else if (left.id === "[") {
					if (state.tokens.curr.left.first) {
						state.tokens.curr.left.first.forEach(function (t) {
							if (funct[t.value] === "const") {
								error("E013", t, t.value);
							}
						});
					} else if (!left.left) {
						warning("E031", that);
					} else if (left.left.value === "arguments" && !state.directive["use strict"]) {
						warning("E031", that);
					}
					that.right = expression(10);
					return that;
				} else if (left.identifier && !isReserved(left)) {
					if (funct[left.value] === "exception") {
						warning("W022", left);
					}
					that.right = expression(10);
					return that;
				}

				if (left === state.syntax["function"]) {
					warning("W023", state.tokens.curr);
				}
			}

			error("E031", that);
		}, p);

		x.exps = true;
		x.assign = true;
		return x;
	}


	function bitwise(s, f, p) {
		var x = symbol(s, p);
		reserveName(x);
		x.led = (typeof f === "function") ? f : function (left) {
			if (state.option.bitwise) {
				warning("W016", this, this.id);
			}
			this.left = left;
			this.right = expression(p);
			return this;
		};
		return x;
	}


	function bitwiseassignop(s) {
		return assignop(s, function (left, that) {
			if (state.option.bitwise) {
				warning("W016", that, that.id);
			}
			nonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (left) {
				if (left.id === "." || left.id === "[" ||
						(left.identifier && !isReserved(left))) {
					expression(10);
					return that;
				}
				if (left === state.syntax["function"]) {
					warning("W023", state.tokens.curr);
				}
				return that;
			}
			error("E031", that);
		}, 20);
	}


	function suffix(s) {
		var x = symbol(s, 150);

		x.led = function (left) {
			if (state.option.plusplus) {
				warning("W016", this, this.id);
			} else if ((!left.identifier || isReserved(left)) && left.id !== "." && left.id !== "[") {
				warning("W017", this);
			}

			this.left = left;
			return this;
		};
		return x;
	}

	// fnparam means that this identifier is being defined as a function
	// argument (see identifier())
	// prop means that this identifier is that of an object property

	function optionalidentifier(fnparam, prop) {
		if (!state.tokens.next.identifier) {
			return;
		}

		advance();

		var curr = state.tokens.curr;
		var val  = state.tokens.curr.value;

		if (!isReserved(curr)) {
			return val;
		}

		if (prop) {
			if (state.option.inES5()) {
				return val;
			}
		}

		if (fnparam && val === "undefined") {
			return val;
		}

		// Display an info message about reserved words as properties
		// and ES5 but do it only once.
		if (prop && !api.getCache("displayed:I002")) {
			api.setCache("displayed:I002", true);
			warning("I002");
		}

		warning("W024", state.tokens.curr, state.tokens.curr.id);
		return val;
	}

	// fnparam means that this identifier is being defined as a function
	// argument
	// prop means that this identifier is that of an object property
	function identifier(fnparam, prop) {
		var i = optionalidentifier(fnparam, prop);
		if (i) {
			return i;
		}
		if (state.tokens.curr.id === "function" && state.tokens.next.id === "(") {
			warning("W025");
		} else {
			error("E030", state.tokens.next, state.tokens.next.value);
		}
	}


	function reachable(s) {
		var i = 0, t;
		if (state.tokens.next.id !== ";" || noreach) {
			return;
		}
		for (;;) {
			do {
				t = peek(i);
				i += 1;
			} while (t.id != "(end)" && t.id === "(comment)");

			if (t.reach) {
				return;
			}
			if (t.id !== "(endline)") {
				if (t.id === "function") {
					if (state.option.latedef === true) {
						warning("W026", t);
					}
					break;
				}

				warning("W027", t, t.value, s);
				break;
			}
		}
	}


	function statement(noindent) {
		var values;
		var i = indent, r, s = scope, t = state.tokens.next;

		if (t.id === ";") {
			advance(";");
			return;
		}

		// Is this a labelled statement?
		var res = isReserved(t);

		// We're being more tolerant here: if someone uses
		// a FutureReservedWord as a label, we warn but proceed
		// anyway.

		if (res && t.meta && t.meta.isFutureReservedWord && peek().id === ":") {
			warning("W024", t, t.id);
			res = false;
		}

		// detect a destructuring assignment
		if (_.has(["[", "{"], t.value)) {
			if (lookupBlockType().isDestAssign) {
				if (!state.option.inESNext()) {
					warning("W104", state.tokens.curr, "destructuring expression");
				}
				values = destructuringExpression();
				values.forEach(function (tok) {
					isundef(funct, "W117", tok.token, tok.id);
				});
				advance("=");
				destructuringExpressionMatch(values, expression(10, true));
				advance(";");
				return;
			}
		}
		if (t.identifier && !res && peek().id === ":") {
			advance();
			advance(":");
			scope = Object.create(s);
			addlabel(t.value, "label");

			if (!state.tokens.next.labelled && state.tokens.next.value !== "{") {
				warning("W028", state.tokens.next, t.value, state.tokens.next.value);
			}

			state.tokens.next.label = t.value;
			t = state.tokens.next;
		}

		// Is it a lonely block?

		if (t.id === "{") {
			// Is it a switch case block?
			//
			//	switch (foo) {
			//		case bar: { <= here.
			//			...
			//		}
			//	}
			var iscase = (funct["(verb)"] === "case" && state.tokens.curr.value === ":");
			block(true, true, false, false, iscase);
			return;
		}

		// Parse the statement.

		if (!noindent) {
			indentation();
		}
		r = expression(0, true);

		// Look for the final semicolon.

		if (!t.block) {
			if (!state.option.expr && (!r || !r.exps)) {
				warning("W030", state.tokens.curr);
			} else if (state.option.nonew && r && r.left && r.id === "(" && r.left.id === "new") {
				warning("W031", t);
			}

			if (state.tokens.next.id !== ";") {
				if (!state.option.asi) {
					// If this is the last statement in a block that ends on
					// the same line *and* option lastsemic is on, ignore the warning.
					// Otherwise, complain about missing semicolon.
					if (!state.option.lastsemic || state.tokens.next.id !== "}" ||
						state.tokens.next.line !== state.tokens.curr.line) {
						warningAt("W033", state.tokens.curr.line, state.tokens.curr.character);
					}
				}
			} else {
				adjacent(state.tokens.curr, state.tokens.next);
				advance(";");
				nonadjacent(state.tokens.curr, state.tokens.next);
			}
		}

		// Restore the indentation.

		indent = i;
		scope = s;
		return r;
	}


	function statements(startLine) {
		var a = [], p;

		while (!state.tokens.next.reach && state.tokens.next.id !== "(end)") {
			if (state.tokens.next.id === ";") {
				p = peek();

				if (!p || (p.id !== "(" && p.id !== "[")) {
					warning("W032");
				}

				advance(";");
			} else {
				a.push(statement(startLine === state.tokens.next.line));
			}
		}
		return a;
	}


	/*
	 * read all directives
	 * recognizes a simple form of asi, but always
	 * warns, if it is used
	 */
	function directives() {
		var i, p, pn;

		for (;;) {
			if (state.tokens.next.id === "(string)") {
				p = peek(0);
				if (p.id === "(endline)") {
					i = 1;
					do {
						pn = peek(i);
						i = i + 1;
					} while (pn.id === "(endline)");

					if (pn.id !== ";") {
						if (pn.id !== "(string)" && pn.id !== "(number)" &&
							pn.id !== "(regexp)" && pn.identifier !== true &&
							pn.id !== "}") {
							break;
						}
						warning("W033", state.tokens.next);
					} else {
						p = pn;
					}
				} else if (p.id === "}") {
					// Directive with no other statements, warn about missing semicolon
					warning("W033", p);
				} else if (p.id !== ";") {
					break;
				}

				indentation();
				advance();
				if (state.directive[state.tokens.curr.value]) {
					warning("W034", state.tokens.curr, state.tokens.curr.value);
				}

				if (state.tokens.curr.value === "use strict") {
					if (!state.option["(explicitNewcap)"])
						state.option.newcap = true;
					state.option.undef = true;
				}

				// there's no directive negation, so always set to true
				state.directive[state.tokens.curr.value] = true;

				if (p.id === ";") {
					advance(";");
				}
				continue;
			}
			break;
		}
	}


	/*
	 * Parses a single block. A block is a sequence of statements wrapped in
	 * braces.
	 *
	 * ordinary     - true for everything but function bodies and try blocks.
	 * stmt		- true if block can be a single statement (e.g. in if/for/while).
	 * isfunc	- true if block is a function body
	 * isfatarrow   -
	 * iscase	- true if block is a switch case block
	 */
	function block(ordinary, stmt, isfunc, isfatarrow, iscase) {
		var a,
			b = inblock,
			old_indent = indent,
			m,
			s = scope,
			t,
			line,
			d;

		inblock = ordinary;

		if (!ordinary || !state.option.funcscope)
			scope = Object.create(scope);

		nonadjacent(state.tokens.curr, state.tokens.next);
		t = state.tokens.next;

		var metrics = funct["(metrics)"];
		metrics.nestedBlockDepth += 1;
		metrics.verifyMaxNestedBlockDepthPerFunction();

		if (state.tokens.next.id === "{") {
			advance("{");

			// create a new block scope
			funct["(blockscope)"].stack();

			line = state.tokens.curr.line;
			if (state.tokens.next.id !== "}") {
				indent += state.option.indent;
				while (!ordinary && state.tokens.next.from > indent) {
					indent += state.option.indent;
				}

				if (isfunc) {
					m = {};
					for (d in state.directive) {
						if (_.has(state.directive, d)) {
							m[d] = state.directive[d];
						}
					}
					directives();

					if (state.option.strict && funct["(context)"]["(global)"]) {
						if (!m["use strict"] && !state.directive["use strict"]) {
							warning("E007");
						}
					}
				}

				a = statements(line);

				metrics.statementCount += a.length;

				if (isfunc) {
					state.directive = m;
				}

				indent -= state.option.indent;
				if (line !== state.tokens.next.line) {
					indentation();
				}
			} else if (line !== state.tokens.next.line) {
				indentation();
			}
			advance("}", t);

			funct["(blockscope)"].unstack();

			indent = old_indent;
		} else if (!ordinary) {
			if (isfunc) {
				m = {};
				if (stmt && !isfatarrow && !state.option.inMoz(true)) {
					error("W118", state.tokens.curr, "function closure expressions");
				}

				if (!stmt) {
					for (d in state.directive) {
						if (_.has(state.directive, d)) {
							m[d] = state.directive[d];
						}
					}
				}
				expression(10);

				if (state.option.strict && funct["(context)"]["(global)"]) {
					if (!m["use strict"] && !state.directive["use strict"]) {
						warning("E007");
					}
				}
			} else {
				error("E021", state.tokens.next, "{", state.tokens.next.value);
			}
		} else {

			// check to avoid let declaration not within a block
			funct["(nolet)"] = true;

			if (!stmt || state.option.curly) {
				warning("W116", state.tokens.next, "{", state.tokens.next.value);
			}

			noreach = true;
			indent += state.option.indent;
			// test indentation only if statement is in new line
			a = [statement(state.tokens.next.line === state.tokens.curr.line)];
			indent -= state.option.indent;
			noreach = false;

			delete funct["(nolet)"];
		}
		// Don't clear and let it propagate out if it is "break", "return", or "throw" in switch case
		if (!(iscase && ["break", "return", "throw"].indexOf(funct["(verb)"]) != -1)) {
			funct["(verb)"] = null;
		}

		if (!ordinary || !state.option.funcscope) scope = s;
		inblock = b;
		if (ordinary && state.option.noempty && (!a || a.length === 0)) {
			warning("W035");
		}
		metrics.nestedBlockDepth -= 1;
		return a;
	}


	function countMember(m) {
		if (membersOnly && typeof membersOnly[m] !== "boolean") {
			warning("W036", state.tokens.curr, m);
		}
		if (typeof member[m] === "number") {
			member[m] += 1;
		} else {
			member[m] = 1;
		}
	}


	function note_implied(tkn) {
		var name = tkn.value, line = tkn.line, a = implied[name];
		if (typeof a === "function") {
			a = false;
		}

		if (!a) {
			a = [line];
			implied[name] = a;
		} else if (a[a.length - 1] !== line) {
			a.push(line);
		}
	}


	// Build the syntax table by declaring the syntactic elements of the language.

	type("(number)", function () {
		return this;
	});

	type("(string)", function () {
		return this;
	});

	state.syntax["(identifier)"] = {
		type: "(identifier)",
		lbp: 0,
		identifier: true,
		nud: function () {
			var v = this.value,
				s = scope[v],
				f;

			if (typeof s === "function") {
				// Protection against accidental inheritance.
				s = undefined;
			} else if (typeof s === "boolean") {
				f = funct;
				funct = functions[0];
				addlabel(v, "var");
				s = funct;
				funct = f;
			}
			var block;
			if (_.has(funct, "(blockscope)")) {
				block = funct["(blockscope)"].getlabel(v);
			}

			// The name is in scope and defined in the current function.
			if (funct === s || block) {
				// Change 'unused' to 'var', and reject labels.
				// the name is in a block scope
				switch (block ? block[v]["(type)"] : funct[v]) {
				case "unused":
					if (block) block[v]["(type)"] = "var";
					else funct[v] = "var";
					break;
				case "unction":
					if (block) block[v]["(type)"] = "function";
					else funct[v] = "function";
					this["function"] = true;
					break;
				case "function":
					this["function"] = true;
					break;
				case "label":
					warning("W037", state.tokens.curr, v);
					break;
				}
			} else if (funct["(global)"]) {
				// The name is not defined in the function.  If we are in the global
				// scope, then we have an undefined variable.
				//
				// Operators typeof and delete do not raise runtime errors even if
				// the base object of a reference is null so no need to display warning
				// if we're inside of typeof or delete.

				if (typeof predefined[v] !== "boolean") {
					// Attempting to subscript a null reference will throw an
					// error, even within the typeof and delete operators
					if (!(anonname === "typeof" || anonname === "delete") ||
						(state.tokens.next && (state.tokens.next.value === "." ||
							state.tokens.next.value === "["))) {

						// if we're in a list comprehension, variables are declared
						// locally and used before being defined. So we check
						// the presence of the given variable in the comp array
						// before declaring it undefined.

						if (!funct["(comparray)"].check(v)) {
							isundef(funct, "W117", state.tokens.curr, v);
						}
					}
				}

				note_implied(state.tokens.curr);
			} else {
				// If the name is already defined in the current
				// function, but not as outer, then there is a scope error.

				switch (funct[v]) {
				case "closure":
				case "function":
				case "var":
				case "unused":
					warning("W038", state.tokens.curr, v);
					break;
				case "label":
					warning("W037", state.tokens.curr, v);
					break;
				case "outer":
				case "global":
					break;
				default:
					// If the name is defined in an outer function, make an outer entry,
					// and if it was unused, make it var.
					if (s === true) {
						funct[v] = true;
					} else if (s === null) {
						warning("W039", state.tokens.curr, v);
						note_implied(state.tokens.curr);
					} else if (typeof s !== "object") {
						// Operators typeof and delete do not raise runtime errors even
						// if the base object of a reference is null so no need to
						//
						// display warning if we're inside of typeof or delete.
						// Attempting to subscript a null reference will throw an
						// error, even within the typeof and delete operators
						if (!(anonname === "typeof" || anonname === "delete") ||
							(state.tokens.next &&
								(state.tokens.next.value === "." || state.tokens.next.value === "["))) {

							isundef(funct, "W117", state.tokens.curr, v);
						}
						funct[v] = true;
						note_implied(state.tokens.curr);
					} else {
						switch (s[v]) {
						case "function":
						case "unction":
							this["function"] = true;
							s[v] = "closure";
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "var":
						case "unused":
							s[v] = "closure";
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "closure":
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "label":
							warning("W037", state.tokens.curr, v);
						}
					}
				}
			}
			return this;
		},
		led: function () {
			error("E033", state.tokens.next, state.tokens.next.value);
		}
	};

	type("(regexp)", function () {
		return this;
	});

	// ECMAScript parser

	delim("(endline)");
	delim("(begin)");
	delim("(end)").reach = true;
	delim("(error)").reach = true;
	delim("}").reach = true;
	delim(")");
	delim("]");
	delim("\"").reach = true;
	delim("'").reach = true;
	delim(";");
	delim(":").reach = true;
	delim("#");

	reserve("else");
	reserve("case").reach = true;
	reserve("catch");
	reserve("default").reach = true;
	reserve("finally");
	reservevar("arguments", function (x) {
		if (state.directive["use strict"] && funct["(global)"]) {
			warning("E008", x);
		}
	});
	reservevar("eval");
	reservevar("false");
	reservevar("Infinity");
	reservevar("null");
	reservevar("this", function (x) {
		if (state.directive["use strict"] && !state.option.validthis && ((funct["(statement)"] &&
				funct["(name)"].charAt(0) > "Z") || funct["(global)"])) {
			warning("W040", x);
		}
	});
	reservevar("true");
	reservevar("undefined");

	assignop("=", "assign", 20);
	assignop("+=", "assignadd", 20);
	assignop("-=", "assignsub", 20);
	assignop("*=", "assignmult", 20);
	assignop("/=", "assigndiv", 20).nud = function () {
		error("E014");
	};
	assignop("%=", "assignmod", 20);

	bitwiseassignop("&=", "assignbitand", 20);
	bitwiseassignop("|=", "assignbitor", 20);
	bitwiseassignop("^=", "assignbitxor", 20);
	bitwiseassignop("<<=", "assignshiftleft", 20);
	bitwiseassignop(">>=", "assignshiftright", 20);
	bitwiseassignop(">>>=", "assignshiftrightunsigned", 20);
	infix(",", function (left, that) {
		var expr;
		that.exprs = [left];
		if (!comma({peek: true})) {
			return that;
		}
		while (true) {
			if (!(expr = expression(10)))  {
				break;
			}
			that.exprs.push(expr);
			if (state.tokens.next.value !== "," || !comma()) {
				break;
			}
		}
		return that;
	}, 10, true);

	infix("?", function (left, that) {
		increaseComplexityCount();
		that.left = left;
		that.right = expression(10);
		advance(":");
		that["else"] = expression(10);
		return that;
	}, 30);

	var orPrecendence = 40;
	infix("||", function (left, that) {
		increaseComplexityCount();
		that.left = left;
		that.right = expression(orPrecendence);
		return that;
	}, orPrecendence);
	infix("&&", "and", 50);
	bitwise("|", "bitor", 70);
	bitwise("^", "bitxor", 80);
	bitwise("&", "bitand", 90);
	relation("==", function (left, right) {
		var eqnull = state.option.eqnull && (left.value === "null" || right.value === "null");

		if (!eqnull && state.option.eqeqeq)
			warning("W116", this, "===", "==");
		else if (isPoorRelation(left))
			warning("W041", this, "===", left.value);
		else if (isPoorRelation(right))
			warning("W041", this, "===", right.value);
		else if (isTypoTypeof(right, left))
			warning("W122", this, right.value);
		else if (isTypoTypeof(left, right))
			warning("W122", this, left.value);
		return this;
	});
	relation("===", function (left, right) {
		if (isTypoTypeof(right, left)) {
			warning("W122", this, right.value);
		} else if (isTypoTypeof(left, right)) {
			warning("W122", this, left.value);
		}
		return this;
	});
	relation("!=", function (left, right) {
		var eqnull = state.option.eqnull &&
				(left.value === "null" || right.value === "null");

		if (!eqnull && state.option.eqeqeq) {
			warning("W116", this, "!==", "!=");
		} else if (isPoorRelation(left)) {
			warning("W041", this, "!==", left.value);
		} else if (isPoorRelation(right)) {
			warning("W041", this, "!==", right.value);
		} else if (isTypoTypeof(right, left)) {
			warning("W122", this, right.value);
		} else if (isTypoTypeof(left, right)) {
			warning("W122", this, left.value);
		}
		return this;
	});
	relation("!==", function (left, right) {
		if (isTypoTypeof(right, left)) {
			warning("W122", this, right.value);
		} else if (isTypoTypeof(left, right)) {
			warning("W122", this, left.value);
		}
		return this;
	});
	relation("<");
	relation(">");
	relation("<=");
	relation(">=");
	bitwise("<<", "shiftleft", 120);
	bitwise(">>", "shiftright", 120);
	bitwise(">>>", "shiftrightunsigned", 120);
	infix("in", "in", 120);
	infix("instanceof", "instanceof", 120);
	infix("+", function (left, that) {
		var right = expression(130);
		if (left && right && left.id === "(string)" && right.id === "(string)") {
			left.value += right.value;
			left.character = right.character;
			if (!state.option.scripturl && reg.javascriptURL.test(left.value)) {
				warning("W050", left);
			}
			return left;
		}
		that.left = left;
		that.right = right;
		return that;
	}, 130);
	prefix("+", "num");
	prefix("+++", function () {
		warning("W007");
		this.right = expression(150);
		this.arity = "unary";
		return this;
	});
	infix("+++", function (left) {
		warning("W007");
		this.left = left;
		this.right = expression(130);
		return this;
	}, 130);
	infix("-", "sub", 130);
	prefix("-", "neg");
	prefix("---", function () {
		warning("W006");
		this.right = expression(150);
		this.arity = "unary";
		return this;
	});
	infix("---", function (left) {
		warning("W006");
		this.left = left;
		this.right = expression(130);
		return this;
	}, 130);
	infix("*", "mult", 140);
	infix("/", "div", 140);
	infix("%", "mod", 140);

	suffix("++", "postinc");
	prefix("++", "preinc");
	state.syntax["++"].exps = true;

	suffix("--", "postdec");
	prefix("--", "predec");
	state.syntax["--"].exps = true;
	prefix("delete", function () {
		var p = expression(10);
		if (!p || (p.id !== "." && p.id !== "[")) {
			warning("W051");
		}
		this.first = p;
		return this;
	}).exps = true;

	prefix("~", function () {
		if (state.option.bitwise) {
			warning("W052", this, "~");
		}
		expression(150);
		return this;
	});

	prefix("...", function () {
		if (!state.option.inESNext()) {
			warning("W104", this, "spread/rest operator");
		}
		if (!state.tokens.next.identifier) {
			error("E030", state.tokens.next, state.tokens.next.value);
		}
		expression(150);
		return this;
	});

	prefix("!", function () {
		this.right = expression(150);
		this.arity = "unary";

		if (!this.right) { // '!' followed by nothing? Give up.
			quit("E041", this.line || 0);
		}

		if (bang[this.right.id] === true) {
			warning("W018", this, "!");
		}
		return this;
	});

	prefix("typeof", "typeof");
	prefix("new", function () {
		var c = expression(155), i;
		if (c && c.id !== "function") {
			if (c.identifier) {
				c["new"] = true;
				switch (c.value) {
				case "Number":
				case "String":
				case "Boolean":
				case "Math":
				case "JSON":
					warning("W053", state.tokens.prev, c.value);
					break;
				case "Function":
					if (!state.option.evil) {
						warning("W054");
					}
					break;
				case "Date":
				case "RegExp":
				case "this":
					break;
				default:
					if (c.id !== "function") {
						i = c.value.substr(0, 1);
						if (state.option.newcap && (i < "A" || i > "Z") && !_.has(global, c.value)) {
							warning("W055", state.tokens.curr);
						}
					}
				}
			} else {
				if (c.id !== "." && c.id !== "[" && c.id !== "(") {
					warning("W056", state.tokens.curr);
				}
			}
		} else {
			if (!state.option.supernew)
				warning("W057", this);
		}
		adjacent(state.tokens.curr, state.tokens.next);
		if (state.tokens.next.id !== "(" && !state.option.supernew) {
			warning("W058", state.tokens.curr, state.tokens.curr.value);
		}
		this.first = c;
		return this;
	});
	state.syntax["new"].exps = true;

	prefix("void").exps = true;

	infix(".", function (left, that) {
		adjacent(state.tokens.prev, state.tokens.curr);
		nobreak();
		var m = identifier(false, true);

		if (typeof m === "string") {
			countMember(m);
		}

		that.left = left;
		that.right = m;

		if (m && m === "hasOwnProperty" && state.tokens.next.value === "=") {
			warning("W001");
		}

		if (left && left.value === "arguments" && (m === "callee" || m === "caller")) {
			if (state.option.noarg)
				warning("W059", left, m);
			else if (state.directive["use strict"])
				error("E008");
		} else if (!state.option.evil && left && left.value === "document" &&
				(m === "write" || m === "writeln")) {
			warning("W060", left);
		}

		if (!state.option.evil && (m === "eval" || m === "execScript")) {
			warning("W061");
		}

		return that;
	}, 160, true);

	infix("(", function (left, that) {
		if (state.tokens.prev.id !== "}" && state.tokens.prev.id !== ")") {
			nobreak(state.tokens.prev, state.tokens.curr);
		}

		nospace();
		if (state.option.immed && left && !left.immed && left.id === "function") {
			warning("W062");
		}

		var n = 0;
		var p = [];

		if (left) {
			if (left.type === "(identifier)") {
				if (left.value.match(/^[A-Z]([A-Z0-9_$]*[a-z][A-Za-z0-9_$]*)?$/)) {
					if ("Number String Boolean Date Object".indexOf(left.value) === -1) {
						if (left.value === "Math") {
							warning("W063", left);
						} else if (state.option.newcap) {
							warning("W064", left);
						}
					}
				}
			}
		}

		if (state.tokens.next.id !== ")") {
			for (;;) {
				p[p.length] = expression(10);
				n += 1;
				if (state.tokens.next.id !== ",") {
					break;
				}
				comma();
			}
		}

		advance(")");
		nospace(state.tokens.prev, state.tokens.curr);

		if (typeof left === "object") {
			if (state.option.inES3() && left.value === "parseInt" && n === 1) {
				warning("W065", state.tokens.curr);
			}
			if (!state.option.evil) {
				if (left.value === "eval" || left.value === "Function" ||
						left.value === "execScript") {
					warning("W061", left);

					if (p[0] && [0].id === "(string)") {
						addInternalSrc(left, p[0].value);
					}
				} else if (p[0] && p[0].id === "(string)" &&
					   (left.value === "setTimeout" ||
						left.value === "setInterval")) {
					warning("W066", left);
					addInternalSrc(left, p[0].value);

				// window.setTimeout/setInterval
				} else if (p[0] && p[0].id === "(string)" &&
					   left.value === "." &&
					   left.left.value === "window" &&
					   (left.right === "setTimeout" ||
						left.right === "setInterval")) {
					warning("W066", left);
					addInternalSrc(left, p[0].value);
				}
			}
			if (!left.identifier && left.id !== "." && left.id !== "[" &&
					left.id !== "(" && left.id !== "&&" && left.id !== "||" &&
					left.id !== "?") {
				warning("W067", left);
			}
		}

		that.left = left;
		return that;
	}, 155, true).exps = true;

	prefix("(", function () {
		nospace();
		var bracket, brackets = [];
		var pn, pn1, i = 0;
		var ret;

		do {
			pn = peek(i);
			i += 1;
			pn1 = peek(i);
			i += 1;
		} while (pn.value !== ")" && pn1.value !== "=>" && pn1.value !== ";" && pn1.type !== "(end)");

		if (state.tokens.next.id === "function") {
			state.tokens.next.immed = true;
		}

		var exprs = [];

		if (state.tokens.next.id !== ")") {
			for (;;) {
				if (pn1.value === "=>" && state.tokens.next.value === "{") {
					bracket = state.tokens.next;
					bracket.left = destructuringExpression();
					brackets.push(bracket);
					for (var t in bracket.left) {
						exprs.push(bracket.left[t].token);
					}
				} else {
					exprs.push(expression(10));
				}
				if (state.tokens.next.id !== ",") {
					break;
				}
				comma();
			}
		}

		advance(")", this);
		nospace(state.tokens.prev, state.tokens.curr);
		if (state.option.immed && exprs[0] && exprs[0].id === "function") {
			if (state.tokens.next.id !== "(" &&
			  (state.tokens.next.id !== "." || (peek().value !== "call" && peek().value !== "apply"))) {
				warning("W068", this);
			}
		}

		if (state.tokens.next.value === "=>") {
			return exprs;
		}
		if (!exprs.length) {
			return;
		}
		if (exprs.length > 1) {
			ret = Object.create(state.syntax[","]);
			ret.exprs = exprs;
		} else {
			ret = exprs[0];
		}
		if (ret) {
			ret.paren = true;
		}
		return ret;
	});

	application("=>");

	infix("[", function (left, that) {
		nobreak(state.tokens.prev, state.tokens.curr);
		nospace();
		var e = expression(10), s;
		if (e && e.type === "(string)") {
			if (!state.option.evil && (e.value === "eval" || e.value === "execScript")) {
				warning("W061", that);
			}

			countMember(e.value);
			if (!state.option.sub && reg.identifier.test(e.value)) {
				s = state.syntax[e.value];
				if (!s || !isReserved(s)) {
					warning("W069", state.tokens.prev, e.value);
				}
			}
		}
		advance("]", that);

		if (e && e.value === "hasOwnProperty" && state.tokens.next.value === "=") {
			warning("W001");
		}

		nospace(state.tokens.prev, state.tokens.curr);
		that.left = left;
		that.right = e;
		return that;
	}, 160, true);

	function comprehensiveArrayExpression() {
		var res = {};
		res.exps = true;
		funct["(comparray)"].stack();

		// Handle reversed for expressions, used in spidermonkey
		var reversed = false;
		if (state.tokens.next.value !== "for") {
			reversed = true;
			if (!state.option.inMoz(true)) {
				warning("W116", state.tokens.next, "for", state.tokens.next.value);
			}
			funct["(comparray)"].setState("use");
			res.right = expression(10);
		}

		advance("for");
		if (state.tokens.next.value === "each") {
			advance("each");
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "for each");
			}
		}
		advance("(");
		funct["(comparray)"].setState("define");
		res.left = expression(130);
		if (_.contains(["in", "of"], state.tokens.next.value)) {
			advance();
		} else {
			error("E045", state.tokens.curr);
		}
		funct["(comparray)"].setState("generate");
		expression(10);

		advance(")");
		if (state.tokens.next.value === "if") {
			advance("if");
			advance("(");
			funct["(comparray)"].setState("filter");
			res.filter = expression(10);
			advance(")");
		}

		if (!reversed) {
			funct["(comparray)"].setState("use");
			res.right = expression(10);
		}

		advance("]");
		funct["(comparray)"].unstack();
		return res;
	}

	prefix("[", function () {
		var blocktype = lookupBlockType(true);
		if (blocktype.isCompArray) {
			if (!state.option.inESNext()) {
				warning("W119", state.tokens.curr, "array comprehension");
			}
			return comprehensiveArrayExpression();
		} else if (blocktype.isDestAssign && !state.option.inESNext()) {
			warning("W104", state.tokens.curr, "destructuring assignment");
		}
		var b = state.tokens.curr.line !== state.tokens.next.line;
		this.first = [];
		if (b) {
			indent += state.option.indent;
			if (state.tokens.next.from === indent + state.option.indent) {
				indent += state.option.indent;
			}
		}
		while (state.tokens.next.id !== "(end)") {
			while (state.tokens.next.id === ",") {
				if (!state.option.inES5())
					warning("W070");
				advance(",");
			}
			if (state.tokens.next.id === "]") {
				break;
			}
			if (b && state.tokens.curr.line !== state.tokens.next.line) {
				indentation();
			}
			this.first.push(expression(10));
			if (state.tokens.next.id === ",") {
				comma({ allowTrailing: true });
				if (state.tokens.next.id === "]" && !state.option.inES5(true)) {
					warning("W070", state.tokens.curr);
					break;
				}
			} else {
				break;
			}
		}
		if (b) {
			indent -= state.option.indent;
			indentation();
		}
		advance("]", this);
		return this;
	}, 160);


	function property_name() {
		var id = optionalidentifier(false, true);

		if (!id) {
			if (state.tokens.next.id === "(string)") {
				id = state.tokens.next.value;
				advance();
			} else if (state.tokens.next.id === "(number)") {
				id = state.tokens.next.value.toString();
				advance();
			}
		}

		if (id === "hasOwnProperty") {
			warning("W001");
		}

		return id;
	}


	function functionparams(parsed) {
		var curr, next;
		var params = [];
		var ident;
		var tokens = [];
		var t;
		var pastDefault = false;

		if (parsed) {
			if (parsed instanceof Array) {
				for (var i in parsed) {
					curr = parsed[i];
					if (_.contains(["{", "["], curr.id)) {
						for (t in curr.left) {
							t = tokens[t];
							if (t.id) {
								params.push(t.id);
								addlabel(t.id, "unused", t.token);
							}
						}
					} else if (curr.value === "...") {
						if (!state.option.inESNext()) {
							warning("W104", curr, "spread/rest operator");
						}
						continue;
					} else {
						addlabel(curr.value, "unused", curr);
					}
				}
				return params;
			} else {
				if (parsed.identifier === true) {
					addlabel(parsed.value, "unused", parsed);
					return [parsed];
				}
			}
		}

		next = state.tokens.next;

		advance("(");
		nospace();

		if (state.tokens.next.id === ")") {
			advance(")");
			return;
		}

		for (;;) {
			if (_.contains(["{", "["], state.tokens.next.id)) {
				tokens = destructuringExpression();
				for (t in tokens) {
					t = tokens[t];
					if (t.id) {
						params.push(t.id);
						addlabel(t.id, "unused", t.token);
					}
				}
			} else if (state.tokens.next.value === "...") {
				if (!state.option.inESNext()) {
					warning("W104", state.tokens.next, "spread/rest operator");
				}
				advance("...");
				nospace();
				ident = identifier(true);
				params.push(ident);
				addlabel(ident, "unused", state.tokens.curr);
			} else {
				ident = identifier(true);
				params.push(ident);
				addlabel(ident, "unused", state.tokens.curr);
			}

			// it is a syntax error to have a regular argument after a default argument
			if (pastDefault) {
				if (state.tokens.next.id !== "=") {
					error("E051", state.tokens.current);
				}
			}
			if (state.tokens.next.id === "=") {
				if (!state.option.inESNext()) {
					warning("W119", state.tokens.next, "default parameters");
				}
				advance("=");
				pastDefault = true;
				expression(10);
			}
			if (state.tokens.next.id === ",") {
				comma();
			} else {
				advance(")", next);
				nospace(state.tokens.prev, state.tokens.curr);
				return params;
			}
		}
	}


	function doFunction(name, statement, generator, fatarrowparams) {
		var f;
		var oldOption = state.option;
		var oldIgnored = state.ignored;
		var oldScope  = scope;

		state.option = Object.create(state.option);
		state.ignored = Object.create(state.ignored);
		scope  = Object.create(scope);

		funct = {
			"(name)"      : name || "\"" + anonname + "\"",
			"(line)"      : state.tokens.next.line,
			"(character)" : state.tokens.next.character,
			"(context)"   : funct,
			"(breakage)"  : 0,
			"(loopage)"   : 0,
			"(metrics)"   : createMetrics(state.tokens.next),
			"(scope)"     : scope,
			"(statement)" : statement,
			"(tokens)"    : {},
			"(blockscope)": funct["(blockscope)"],
			"(comparray)" : funct["(comparray)"]
		};

		if (generator) {
			funct["(generator)"] = true;
		}

		f = funct;
		state.tokens.curr.funct = funct;

		functions.push(funct);

		if (name) {
			addlabel(name, "function");
		}

		funct["(params)"] = functionparams(fatarrowparams);
		funct["(metrics)"].verifyMaxParametersPerFunction(funct["(params)"]);

		block(false, true, true, fatarrowparams ? true:false);

		if (generator && funct["(generator)"] !== "yielded") {
			error("E047", state.tokens.curr);
		}

		funct["(metrics)"].verifyMaxStatementsPerFunction();
		funct["(metrics)"].verifyMaxComplexityPerFunction();
		funct["(unusedOption)"] = state.option.unused;

		scope = oldScope;
		state.option = oldOption;
		state.ignored = oldIgnored;
		funct["(last)"] = state.tokens.curr.line;
		funct["(lastcharacter)"] = state.tokens.curr.character;
		funct = funct["(context)"];

		return f;
	}

	function createMetrics(functionStartToken) {
		return {
			statementCount: 0,
			nestedBlockDepth: -1,
			ComplexityCount: 1,

			verifyMaxStatementsPerFunction: function () {
				if (state.option.maxstatements &&
					this.statementCount > state.option.maxstatements) {
					warning("W071", functionStartToken, this.statementCount);
				}
			},

			verifyMaxParametersPerFunction: function (params) {
				params = params || [];

				if (state.option.maxparams && params.length > state.option.maxparams) {
					warning("W072", functionStartToken, params.length);
				}
			},

			verifyMaxNestedBlockDepthPerFunction: function () {
				if (state.option.maxdepth &&
					this.nestedBlockDepth > 0 &&
					this.nestedBlockDepth === state.option.maxdepth + 1) {
					warning("W073", null, this.nestedBlockDepth);
				}
			},

			verifyMaxComplexityPerFunction: function () {
				var max = state.option.maxcomplexity;
				var cc = this.ComplexityCount;
				if (max && cc > max) {
					warning("W074", functionStartToken, cc);
				}
			}
		};
	}

	function increaseComplexityCount() {
		funct["(metrics)"].ComplexityCount += 1;
	}

	// Parse assignments that were found instead of conditionals.
	// For example: if (a = 1) { ... }

	function checkCondAssignment(expr) {
		var id, paren;
		if (expr) {
			id = expr.id;
			paren = expr.paren;
			if (id === "," && (expr = expr.exprs[expr.exprs.length - 1])) {
				id = expr.id;
				paren = paren || expr.paren;
			}
		}
		switch (id) {
		case "=":
		case "+=":
		case "-=":
		case "*=":
		case "%=":
		case "&=":
		case "|=":
		case "^=":
		case "/=":
			if (!paren && !state.option.boss) {
				warning("W084");
			}
		}
	}


	(function (x) {
		x.nud = function (isclassdef) {
			var b, f, i, p, t, g;
			var props = {}; // All properties, including accessors
			var tag = "";

			function saveProperty(name, tkn) {
				if (props[name] && _.has(props, name))
					warning("W075", state.tokens.next, i);
				else
					props[name] = {};

				props[name].basic = true;
				props[name].basictkn = tkn;
			}

			function saveSetter(name, tkn) {
				if (props[name] && _.has(props, name)) {
					if (props[name].basic || props[name].setter)
						warning("W075", state.tokens.next, i);
				} else {
					props[name] = {};
				}

				props[name].setter = true;
				props[name].setterToken = tkn;
			}

			function saveGetter(name) {
				if (props[name] && _.has(props, name)) {
					if (props[name].basic || props[name].getter)
						warning("W075", state.tokens.next, i);
				} else {
					props[name] = {};
				}

				props[name].getter = true;
				props[name].getterToken = state.tokens.curr;
			}

			b = state.tokens.curr.line !== state.tokens.next.line;
			if (b) {
				indent += state.option.indent;
				if (state.tokens.next.from === indent + state.option.indent) {
					indent += state.option.indent;
				}
			}

			for (;;) {
				if (state.tokens.next.id === "}") {
					break;
				}

				if (b) {
					indentation();
				}

				if (isclassdef && state.tokens.next.value === "static") {
					advance("static");
					tag = "static ";
				}

				if (state.tokens.next.value === "get" && peek().id !== ":") {
					advance("get");

					if (!state.option.inES5(!isclassdef)) {
						error("E034");
					}

					i = property_name();
					if (!i) {
						error("E035");
					}

					// It is a Syntax Error if PropName of MethodDefinition is
					// "constructor" and SpecialMethod of MethodDefinition is true.
					if (isclassdef && i === "constructor") {
						error("E049", state.tokens.next, "class getter method", i);
					}

					saveGetter(tag + i);
					t = state.tokens.next;
					adjacent(state.tokens.curr, state.tokens.next);
					f = doFunction();
					p = f["(params)"];

					if (p) {
						warning("W076", t, p[0], i);
					}

					adjacent(state.tokens.curr, state.tokens.next);
				} else if (state.tokens.next.value === "set" && peek().id !== ":") {
					advance("set");

					if (!state.option.inES5(!isclassdef)) {
						error("E034");
					}

					i = property_name();
					if (!i) {
						error("E035");
					}

					// It is a Syntax Error if PropName of MethodDefinition is
					// "constructor" and SpecialMethod of MethodDefinition is true.
					if (isclassdef && i === "constructor") {
						error("E049", state.tokens.next, "class setter method", i);
					}

					saveSetter(tag + i, state.tokens.next);
					t = state.tokens.next;
					adjacent(state.tokens.curr, state.tokens.next);
					f = doFunction();
					p = f["(params)"];

					if (!p || p.length !== 1) {
						warning("W077", t, i);
					}
				} else {
					g = false;
					if (state.tokens.next.value === "*" && state.tokens.next.type === "(punctuator)") {
						if (!state.option.inESNext()) {
							warning("W104", state.tokens.next, "generator functions");
						}
						advance("*");
						g = true;
					}
					i = property_name();
					saveProperty(tag + i, state.tokens.next);

					if (typeof i !== "string") {
						break;
					}

					if (state.tokens.next.value === "(") {
						if (!state.option.inESNext()) {
							warning("W104", state.tokens.curr, "concise methods");
						}
						doFunction(i, undefined, g);
					} else if (!isclassdef) {
						advance(":");
						nonadjacent(state.tokens.curr, state.tokens.next);
						expression(10);
					}
				}
				// It is a Syntax Error if PropName of MethodDefinition is "prototype".
				if (isclassdef && i === "prototype") {
					error("E049", state.tokens.next, "class method", i);
				}

				countMember(i);
				if (isclassdef) {
					tag = "";
					continue;
				}
				if (state.tokens.next.id === ",") {
					comma({ allowTrailing: true, property: true });
					if (state.tokens.next.id === ",") {
						warning("W070", state.tokens.curr);
					} else if (state.tokens.next.id === "}" && !state.option.inES5(true)) {
						warning("W070", state.tokens.curr);
					}
				} else {
					break;
				}
			}
			if (b) {
				indent -= state.option.indent;
				indentation();
			}
			advance("}", this);

			// Check for lonely setters if in the ES5 mode.
			if (state.option.inES5()) {
				for (var name in props) {
					if (_.has(props, name) && props[name].setter && !props[name].getter) {
						warning("W078", props[name].setterToken);
					}
				}
			}
			return this;
		};
		x.fud = function () {
			error("E036", state.tokens.curr);
		};
	}(delim("{")));

	function destructuringExpression() {
		var id, ids;
		var identifiers = [];
		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "destructuring expression");
		}
		var nextInnerDE = function () {
			var ident;
			if (_.contains(["[", "{"], state.tokens.next.value)) {
				ids = destructuringExpression();
				for (var id in ids) {
					id = ids[id];
					identifiers.push({ id: id.id, token: id.token });
				}
			} else if (state.tokens.next.value === ",") {
				identifiers.push({ id: null, token: state.tokens.curr });
			} else {
				ident = identifier();
				if (ident)
					identifiers.push({ id: ident, token: state.tokens.curr });
			}
		};
		if (state.tokens.next.value === "[") {
			advance("[");
			nextInnerDE();
			while (state.tokens.next.value !== "]") {
				advance(",");
				nextInnerDE();
			}
			advance("]");
		} else if (state.tokens.next.value === "{") {
			advance("{");
			id = identifier();
			if (state.tokens.next.value === ":") {
				advance(":");
				nextInnerDE();
			} else {
				identifiers.push({ id: id, token: state.tokens.curr });
			}
			while (state.tokens.next.value !== "}") {
				advance(",");
				id = identifier();
				if (state.tokens.next.value === ":") {
					advance(":");
					nextInnerDE();
				} else {
					identifiers.push({ id: id, token: state.tokens.curr });
				}
			}
			advance("}");
		}
		return identifiers;
	}
	function destructuringExpressionMatch(tokens, value) {
		if (value.first) {
			_.zip(tokens, value.first).forEach(function (val) {
				var token = val[0];
				var value = val[1];
				if (token && value) {
					token.first = value;
				} else if (token && token.first && !value) {
					warning("W080", token.first, token.first.value);
				} /* else {
					XXX value is discarded: wouldn't it need a warning ?
				} */
			});
		}
	}

	var conststatement = stmt("const", function (prefix) {
		var tokens, value;
		// state variable to know if it is a lone identifier, or a destructuring statement.
		var lone;

		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "const");
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id) {
					addlabel(t.id, "const");
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id !== "=") {
				warning("E012", state.tokens.curr, state.tokens.curr.value);
			}

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					warning("W120", state.tokens.next, state.tokens.next.value);
				}
				value = expression(10);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		return this;
	});
	conststatement.exps = true;
	var varstatement = stmt("var", function (prefix) {
		// JavaScript does not have block scope. It only has function scope. So,
		// declaring a variable in a block can have unexpected consequences.
		var tokens, lone, value;

		if (funct["(onevar)"] && state.option.onevar) {
			warning("W081");
		} else if (!funct["(global)"]) {
			funct["(onevar)"] = true;
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (state.option.inESNext() && funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id) {
					addlabel(t.id, "unused", t.token);
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					warning("W120", state.tokens.next, state.tokens.next.value);
				}
				value = expression(10);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		return this;
	});
	varstatement.exps = true;
	var letstatement = stmt("let", function (prefix) {
		var tokens, lone, value, letblock;

		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "let");
		}

		if (state.tokens.next.value === "(") {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.next, "let block");
			}
			advance("(");
			funct["(blockscope)"].stack();
			letblock = true;
		} else if (funct["(nolet)"]) {
			error("E048", state.tokens.curr);
		}

		if (funct["(onevar)"] && state.option.onevar) {
			warning("W081");
		} else if (!funct["(global)"]) {
			funct["(onevar)"] = true;
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr.value } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (state.option.inESNext() && funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id && !funct["(nolet)"]) {
					addlabel(t.id, "unused", t.token, true);
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					warning("W120", state.tokens.next, state.tokens.next.value);
				}
				value = expression(10);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		if (letblock) {
			advance(")");
			block(true, true);
			this.block = true;
			funct["(blockscope)"].unstack();
		}

		return this;
	});
	letstatement.exps = true;

	blockstmt("class", function () {
		return classdef.call(this, true);
	});

	function classdef(stmt) {
		/*jshint validthis:true */
		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "class");
		}
		if (stmt) {
			// BindingIdentifier
			this.name = identifier();
			addlabel(this.name, "unused", state.tokens.curr);
		} else if (state.tokens.next.identifier && state.tokens.next.value !== "extends") {
			// BindingIdentifier(opt)
			this.name = identifier();
		}
		classtail(this);
		return this;
	}

	function classtail(c) {
		var strictness = state.directive["use strict"];

		// ClassHeritage(opt)
		if (state.tokens.next.value === "extends") {
			advance("extends");
			c.heritage = expression(10);
		}

		// A ClassBody is always strict code.
		state.directive["use strict"] = true;
		advance("{");
		// ClassBody(opt)
		c.body = state.syntax["{"].nud(true);
		state.directive["use strict"] = strictness;
	}

	blockstmt("function", function () {
		var generator = false;
		if (state.tokens.next.value === "*") {
			advance("*");
			if (state.option.inESNext(true)) {
				generator = true;
			} else {
				warning("W119", state.tokens.curr, "function*");
			}
		}
		if (inblock) {
			warning("W082", state.tokens.curr);

		}
		var i = identifier();
		if (funct[i] === "const") {
			warning("E011", null, i);
		}
		adjacent(state.tokens.curr, state.tokens.next);
		addlabel(i, "unction", state.tokens.curr);

		doFunction(i, { statement: true }, generator);
		if (state.tokens.next.id === "(" && state.tokens.next.line === state.tokens.curr.line) {
			error("E039");
		}
		return this;
	});

	prefix("function", function () {
		var generator = false;
		if (state.tokens.next.value === "*") {
			if (!state.option.inESNext()) {
				warning("W119", state.tokens.curr, "function*");
			}
			advance("*");
			generator = true;
		}
		var i = optionalidentifier();
		if (i || state.option.gcl) {
			adjacent(state.tokens.curr, state.tokens.next);
		} else {
			nonadjacent(state.tokens.curr, state.tokens.next);
		}
		doFunction(i, undefined, generator);
		if (!state.option.loopfunc && funct["(loopage)"]) {
			warning("W083");
		}
		return this;
	});

	blockstmt("if", function () {
		var t = state.tokens.next;
		increaseComplexityCount();
		state.condition = true;
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		state.condition = false;
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);
		if (state.tokens.next.id === "else") {
			nonadjacent(state.tokens.curr, state.tokens.next);
			advance("else");
			if (state.tokens.next.id === "if" || state.tokens.next.id === "switch") {
				statement(true);
			} else {
				block(true, true);
			}
		}
		return this;
	});

	blockstmt("try", function () {
		var b;

		function doCatch() {
			var oldScope = scope;
			var e;

			advance("catch");
			nonadjacent(state.tokens.curr, state.tokens.next);
			advance("(");

			scope = Object.create(oldScope);

			e = state.tokens.next.value;
			if (state.tokens.next.type !== "(identifier)") {
				e = null;
				warning("E030", state.tokens.next, e);
			}

			advance();

			funct = {
				"(name)"     : "(catch)",
				"(line)"     : state.tokens.next.line,
				"(character)": state.tokens.next.character,
				"(context)"  : funct,
				"(breakage)" : funct["(breakage)"],
				"(loopage)"  : funct["(loopage)"],
				"(scope)"    : scope,
				"(statement)": false,
				"(metrics)"  : createMetrics(state.tokens.next),
				"(catch)"    : true,
				"(tokens)"   : {},
				"(blockscope)": funct["(blockscope)"],
				"(comparray)": funct["(comparray)"]
			};

			if (e) {
				addlabel(e, "exception");
			}

			if (state.tokens.next.value === "if") {
				if (!state.option.inMoz(true)) {
					warning("W118", state.tokens.curr, "catch filter");
				}
				advance("if");
				expression(0);
			}

			advance(")");

			state.tokens.curr.funct = funct;
			functions.push(funct);

			block(false);

			scope = oldScope;

			funct["(last)"] = state.tokens.curr.line;
			funct["(lastcharacter)"] = state.tokens.curr.character;
			funct = funct["(context)"];
		}

		block(false);

		while (state.tokens.next.id === "catch") {
			increaseComplexityCount();
			if (b && (!state.option.inMoz(true))) {
				warning("W118", state.tokens.next, "multiple catch blocks");
			}
			doCatch();
			b = true;
		}

		if (state.tokens.next.id === "finally") {
			advance("finally");
			block(false);
			return;
		}

		if (!b) {
			error("E021", state.tokens.next, "catch", state.tokens.next.value);
		}

		return this;
	});

	blockstmt("while", function () {
		var t = state.tokens.next;
		funct["(breakage)"] += 1;
		funct["(loopage)"] += 1;
		increaseComplexityCount();
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);
		funct["(breakage)"] -= 1;
		funct["(loopage)"] -= 1;
		return this;
	}).labelled = true;

	blockstmt("with", function () {
		var t = state.tokens.next;
		if (state.directive["use strict"]) {
			error("E010", state.tokens.curr);
		} else if (!state.option.withstmt) {
			warning("W085", state.tokens.curr);
		}

		advance("(");
		nonadjacent(this, t);
		nospace();
		expression(0);
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);

		return this;
	});

	blockstmt("switch", function () {
		var t = state.tokens.next;
		var g = false;
		var noindent = false;

		funct["(breakage)"] += 1;
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		nonadjacent(state.tokens.curr, state.tokens.next);
		t = state.tokens.next;
		advance("{");
		nonadjacent(state.tokens.curr, state.tokens.next);

		if (state.tokens.next.from === indent)
			noindent = true;

		if (!noindent)
			indent += state.option.indent;

		this.cases = [];

		for (;;) {
			switch (state.tokens.next.id) {
			case "case":
				switch (funct["(verb)"]) {
				case "yield":
				case "break":
				case "case":
				case "continue":
				case "return":
				case "switch":
				case "throw":
					break;
				default:
					// You can tell JSHint that you don't use break intentionally by
					// adding a comment /* falls through */ on a line just before
					// the next `case`.
					if (!reg.fallsThrough.test(state.lines[state.tokens.next.line - 2])) {
						warning("W086", state.tokens.curr, "case");
					}
				}
				indentation();
				advance("case");
				this.cases.push(expression(20));
				increaseComplexityCount();
				g = true;
				advance(":");
				funct["(verb)"] = "case";
				break;
			case "default":
				switch (funct["(verb)"]) {
				case "yield":
				case "break":
				case "continue":
				case "return":
				case "throw":
					break;
				default:
					// Do not display a warning if 'default' is the first statement or if
					// there is a special /* falls through */ comment.
					if (this.cases.length) {
						if (!reg.fallsThrough.test(state.lines[state.tokens.next.line - 2])) {
							warning("W086", state.tokens.curr, "default");
						}
					}
				}
				indentation();
				advance("default");
				g = true;
				advance(":");
				break;
			case "}":
				if (!noindent)
					indent -= state.option.indent;
				indentation();
				advance("}", t);
				funct["(breakage)"] -= 1;
				funct["(verb)"] = undefined;
				return;
			case "(end)":
				error("E023", state.tokens.next, "}");
				return;
			default:
				indent += state.option.indent;
				if (g) {
					switch (state.tokens.curr.id) {
					case ",":
						error("E040");
						return;
					case ":":
						g = false;
						statements();
						break;
					default:
						error("E025", state.tokens.curr);
						return;
					}
				} else {
					if (state.tokens.curr.id === ":") {
						advance(":");
						error("E024", state.tokens.curr, ":");
						statements();
					} else {
						error("E021", state.tokens.next, "case", state.tokens.next.value);
						return;
					}
				}
				indent -= state.option.indent;
			}
		}
	}).labelled = true;

	stmt("debugger", function () {
		if (!state.option.debug) {
			warning("W087", this);
		}
		return this;
	}).exps = true;

	(function () {
		var x = stmt("do", function () {
			funct["(breakage)"] += 1;
			funct["(loopage)"] += 1;
			increaseComplexityCount();

			this.first = block(true, true);
			advance("while");
			var t = state.tokens.next;
			nonadjacent(state.tokens.curr, t);
			advance("(");
			nospace();
			checkCondAssignment(expression(0));
			advance(")", t);
			nospace(state.tokens.prev, state.tokens.curr);
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;
			return this;
		});
		x.labelled = true;
		x.exps = true;
	}());

	blockstmt("for", function () {
		var s, t = state.tokens.next;
		var letscope = false;
		var foreachtok = null;

		if (t.value === "each") {
			foreachtok = t;
			advance("each");
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "for each");
			}
		}

		funct["(breakage)"] += 1;
		funct["(loopage)"] += 1;
		increaseComplexityCount();
		advance("(");
		nonadjacent(this, t);
		nospace();

		// what kind of for(…) statement it is? for(…of…)? for(…in…)? for(…;…;…)?
		var nextop; // contains the token of the "in" or "of" operator
		var i = 0;
		var inof = ["in", "of"];
		do {
			nextop = peek(i);
			++i;
		} while (!_.contains(inof, nextop.value) && nextop.value !== ";" &&
					nextop.type !== "(end)");

		// if we're in a for (… in|of …) statement
		if (_.contains(inof, nextop.value)) {
			if (!state.option.inESNext() && nextop.value === "of") {
				error("W104", nextop, "for of");
			}
			if (state.tokens.next.id === "var") {
				advance("var");
				state.syntax["var"].fud.call(state.syntax["var"].fud, true);
			} else if (state.tokens.next.id === "let") {
				advance("let");
				// create a new block scope
				letscope = true;
				funct["(blockscope)"].stack();
				state.syntax["let"].fud.call(state.syntax["let"].fud, true);
			} else {
				switch (funct[state.tokens.next.value]) {
				case "unused":
					funct[state.tokens.next.value] = "var";
					break;
				case "var":
					break;
				default:
					if (!funct["(blockscope)"].getlabel(state.tokens.next.value))
						warning("W088", state.tokens.next, state.tokens.next.value);
				}
				advance();
			}
			advance(nextop.value);
			expression(20);
			advance(")", t);
			s = block(true, true);
			if (state.option.forin && s && (s.length > 1 || typeof s[0] !== "object" ||
					s[0].value !== "if")) {
				warning("W089", this);
			}
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;
		} else {
			if (foreachtok) {
				error("E045", foreachtok);
			}
			if (state.tokens.next.id !== ";") {
				if (state.tokens.next.id === "var") {
					advance("var");
					state.syntax["var"].fud.call(state.syntax["var"].fud);
				} else if (state.tokens.next.id === "let") {
					advance("let");
					// create a new block scope
					letscope = true;
					funct["(blockscope)"].stack();
					state.syntax["let"].fud.call(state.syntax["let"].fud);
				} else {
					for (;;) {
						expression(0, "for");
						if (state.tokens.next.id !== ",") {
							break;
						}
						comma();
					}
				}
			}
			nolinebreak(state.tokens.curr);
			advance(";");
			if (state.tokens.next.id !== ";") {
				checkCondAssignment(expression(0));
			}
			nolinebreak(state.tokens.curr);
			advance(";");
			if (state.tokens.next.id === ";") {
				error("E021", state.tokens.next, ")", ";");
			}
			if (state.tokens.next.id !== ")") {
				for (;;) {
					expression(0, "for");
					if (state.tokens.next.id !== ",") {
						break;
					}
					comma();
				}
			}
			advance(")", t);
			nospace(state.tokens.prev, state.tokens.curr);
			block(true, true);
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;

		}
		// unstack loop blockscope
		if (letscope) {
			funct["(blockscope)"].unstack();
		}
		return this;
	}).labelled = true;


	stmt("break", function () {
		var v = state.tokens.next.value;

		if (funct["(breakage)"] === 0)
			warning("W052", state.tokens.next, this.value);

		if (!state.option.asi)
			nolinebreak(this);

		if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
			if (state.tokens.curr.line === state.tokens.next.line) {
				if (funct[v] !== "label") {
					warning("W090", state.tokens.next, v);
				} else if (scope[v] !== funct) {
					warning("W091", state.tokens.next, v);
				}
				this.first = state.tokens.next;
				advance();
			}
		}
		reachable("break");
		return this;
	}).exps = true;


	stmt("continue", function () {
		var v = state.tokens.next.value;

		if (funct["(breakage)"] === 0)
			warning("W052", state.tokens.next, this.value);

		if (!state.option.asi)
			nolinebreak(this);

		if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
			if (state.tokens.curr.line === state.tokens.next.line) {
				if (funct[v] !== "label") {
					warning("W090", state.tokens.next, v);
				} else if (scope[v] !== funct) {
					warning("W091", state.tokens.next, v);
				}
				this.first = state.tokens.next;
				advance();
			}
		} else if (!funct["(loopage)"]) {
			warning("W052", state.tokens.next, this.value);
		}
		reachable("continue");
		return this;
	}).exps = true;


	stmt("return", function () {
		if (this.line === state.tokens.next.line) {
			if (state.tokens.next.id === "(regexp)")
				warning("W092");

			if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
				nonadjacent(state.tokens.curr, state.tokens.next);
				this.first = expression(0);

				if (this.first &&
						this.first.type === "(punctuator)" && this.first.value === "=" && !state.option.boss) {
					warningAt("W093", this.first.line, this.first.character);
				}
			}
		} else {
			if (state.tokens.next.type === "(punctuator)" &&
				["[", "{", "+", "-"].indexOf(state.tokens.next.value) > -1) {
				nolinebreak(this); // always warn (Line breaking error)
			}
		}
		reachable("return");
		return this;
	}).exps = true;

	(function (x) {
		x.exps = true;
		x.lbp = 25;
	}(prefix("yield", function () {
		var prev = state.tokens.prev;
		if (state.option.inESNext(true) && !funct["(generator)"]) {
			error("E046", state.tokens.curr, "yield");
		} else if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "yield");
		}
		funct["(generator)"] = "yielded";
		if (this.line === state.tokens.next.line || !state.option.inMoz(true)) {
			if (state.tokens.next.id === "(regexp)")
				warning("W092");

			if (state.tokens.next.id !== ";" && !state.tokens.next.reach && state.tokens.next.nud) {
				nobreaknonadjacent(state.tokens.curr, state.tokens.next);
				this.first = expression(10);

				if (this.first.type === "(punctuator)" && this.first.value === "=" && !state.option.boss) {
					warningAt("W093", this.first.line, this.first.character);
				}
			}

			if (state.option.inMoz(true) && state.tokens.next.id !== ")" &&
					(prev.lbp > 30 || (!prev.assign && !isEndOfExpr()) || prev.id === "yield")) {
				error("E050", this);
			}
		} else if (!state.option.asi) {
			nolinebreak(this); // always warn (Line breaking error)
		}
		return this;
	})));


	stmt("throw", function () {
		nolinebreak(this);
		nonadjacent(state.tokens.curr, state.tokens.next);
		this.first = expression(20);
		reachable("throw");
		return this;
	}).exps = true;

	stmt("import", function () {
		if (!state.option.inESNext()) {
			warning("W119", state.tokens.curr, "import");
		}

		if (state.tokens.next.identifier) {
			this.name = identifier();
			addlabel(this.name, "unused", state.tokens.curr);
		} else {
			advance("{");
			for (;;) {
				var importName;
				if (state.tokens.next.type === "default") {
					importName = "default";
					advance("default");
				} else {
					importName = identifier();
				}
				if (state.tokens.next.value === "as") {
					advance("as");
					importName = identifier();
				}
				addlabel(importName, "unused", state.tokens.curr);

				if (state.tokens.next.value === ",") {
					advance(",");
				} else if (state.tokens.next.value === "}") {
					advance("}");
					break;
				} else {
					error("E024", state.tokens.next, state.tokens.next.value);
					break;
				}
			}
		}

		advance("from");
		advance("(string)");
		return this;
	}).exps = true;

	stmt("export", function () {
		if (!state.option.inESNext()) {
			warning("W119", state.tokens.curr, "export");
		}

		if (state.tokens.next.type === "default") {
			advance("default");
			if (state.tokens.next.id === "function" || state.tokens.next.id === "class") {
				this.block = true;
			}
			this.exportee = expression(10);

			return this;
		}

		if (state.tokens.next.value === "{") {
			advance("{");
			for (;;) {
				identifier();

				if (state.tokens.next.value === ",") {
					advance(",");
				} else if (state.tokens.next.value === "}") {
					advance("}");
					break;
				} else {
					error("E024", state.tokens.next, state.tokens.next.value);
					break;
				}
			}
			return this;
		}

		if (state.tokens.next.id === "var") {
			advance("var");
			state.syntax["var"].fud.call(state.syntax["var"].fud);
		} else if (state.tokens.next.id === "let") {
			advance("let");
			state.syntax["let"].fud.call(state.syntax["let"].fud);
		} else if (state.tokens.next.id === "const") {
			advance("const");
			state.syntax["const"].fud.call(state.syntax["const"].fud);
		} else if (state.tokens.next.id === "function") {
			this.block = true;
			advance("function");
			state.syntax["function"].fud();
		} else if (state.tokens.next.id === "class") {
			this.block = true;
			advance("class");
			state.syntax["class"].fud();
		} else {
			error("E024", state.tokens.next, state.tokens.next.value);
		}

		return this;
	}).exps = true;

	// Future Reserved Words

	FutureReservedWord("abstract");
	FutureReservedWord("boolean");
	FutureReservedWord("byte");
	FutureReservedWord("char");
	FutureReservedWord("class", { es5: true, nud: classdef });
	FutureReservedWord("double");
	FutureReservedWord("enum", { es5: true });
	FutureReservedWord("export", { es5: true });
	FutureReservedWord("extends", { es5: true });
	FutureReservedWord("final");
	FutureReservedWord("float");
	FutureReservedWord("goto");
	FutureReservedWord("implements", { es5: true, strictOnly: true });
	FutureReservedWord("import", { es5: true });
	FutureReservedWord("int");
	FutureReservedWord("interface", { es5: true, strictOnly: true });
	FutureReservedWord("long");
	FutureReservedWord("native");
	FutureReservedWord("package", { es5: true, strictOnly: true });
	FutureReservedWord("private", { es5: true, strictOnly: true });
	FutureReservedWord("protected", { es5: true, strictOnly: true });
	FutureReservedWord("public", { es5: true, strictOnly: true });
	FutureReservedWord("short");
	FutureReservedWord("static", { es5: true, strictOnly: true });
	FutureReservedWord("super", { es5: true });
	FutureReservedWord("synchronized");
	FutureReservedWord("throws");
	FutureReservedWord("transient");
	FutureReservedWord("volatile");

	// this function is used to determine wether a squarebracket or a curlybracket
	// expression is a comprehension array, destructuring assignment or a json value.

	var lookupBlockType = function () {
		var pn, pn1;
		var i = -1;
		var bracketStack = 0;
		var ret = {};
		if (_.contains(["[", "{"], state.tokens.curr.value))
			bracketStack += 1;
		do {
			pn = (i === -1) ? state.tokens.next : peek(i);
			pn1 = peek(i + 1);
			i = i + 1;
			if (_.contains(["[", "{"], pn.value)) {
				bracketStack += 1;
			} else if (_.contains(["]", "}"], pn.value)) {
				bracketStack -= 1;
			}
			if (pn.identifier && pn.value === "for" && bracketStack === 1) {
				ret.isCompArray = true;
				ret.notJson = true;
				break;
			}
			if (_.contains(["}", "]"], pn.value) && pn1.value === "=" && bracketStack === 0) {
				ret.isDestAssign = true;
				ret.notJson = true;
				break;
			}
			if (pn.value === ";") {
				ret.isBlock = true;
				ret.notJson = true;
			}
		} while (bracketStack > 0 && pn.id !== "(end)" && i < 15);
		return ret;
	};

	// Check whether this function has been reached for a destructuring assign with undeclared values
	function destructuringAssignOrJsonValue() {
		// lookup for the assignment (esnext only)
		// if it has semicolons, it is a block, so go parse it as a block
		// or it's not a block, but there are assignments, check for undeclared variables

		var block = lookupBlockType();
		if (block.notJson) {
			if (!state.option.inESNext() && block.isDestAssign) {
				warning("W104", state.tokens.curr, "destructuring assignment");
			}
			statements();
		// otherwise parse json value
		} else {
			state.option.laxbreak = true;
			state.jsonMode = true;
			jsonValue();
		}
	}

	// array comprehension parsing function
	// parses and defines the three states of the list comprehension in order
	// to avoid defining global variables, but keeping them to the list comprehension scope
	// only. The order of the states are as follows:
	//  * "use" which will be the returned iterative part of the list comprehension
	//  * "define" which will define the variables local to the list comprehension
	//  * "filter" which will help filter out values

	var arrayComprehension = function () {
		var CompArray = function () {
			this.mode = "use";
			this.variables = [];
		};
		var _carrays = [];
		var _current;
		function declare(v) {
			var l = _current.variables.filter(function (elt) {
				// if it has, change its undef state
				if (elt.value === v) {
					elt.undef = false;
					return v;
				}
			}).length;
			return l !== 0;
		}
		function use(v) {
			var l = _current.variables.filter(function (elt) {
				// and if it has been defined
				if (elt.value === v && !elt.undef) {
					if (elt.unused === true) {
						elt.unused = false;
					}
					return v;
				}
			}).length;
			// otherwise we warn about it
			return (l === 0);
		}
		return {stack: function () {
					_current = new CompArray();
					_carrays.push(_current);
				},
				unstack: function () {
					_current.variables.filter(function (v) {
						if (v.unused)
							warning("W098", v.token, v.value);
						if (v.undef)
							isundef(v.funct, "W117", v.token, v.value);
					});
					_carrays.splice(-1, 1);
					_current = _carrays[_carrays.length - 1];
				},
				setState: function (s) {
					if (_.contains(["use", "define", "generate", "filter"], s))
						_current.mode = s;
				},
				check: function (v) {
					if (!_current) {
						return;
					}
					// When we are in "use" state of the list comp, we enqueue that var
					if (_current && _current.mode === "use") {
						if (use(v)) {
							_current.variables.push({
								funct: funct,
								token: state.tokens.curr,
								value: v,
								undef: true,
								unused: false
							});
						}
						return true;
					// When we are in "define" state of the list comp,
					} else if (_current && _current.mode === "define") {
						// check if the variable has been used previously
						if (!declare(v)) {
							_current.variables.push({
								funct: funct,
								token: state.tokens.curr,
								value: v,
								undef: false,
								unused: true
							});
						}
						return true;
					// When we are in the "generate" state of the list comp,
					} else if (_current && _current.mode === "generate") {
						isundef(funct, "W117", state.tokens.curr, v);
						return true;
					// When we are in "filter" state,
					} else if (_current && _current.mode === "filter") {
						// we check whether current variable has been declared
						if (use(v)) {
							// if not we warn about it
							isundef(funct, "W117", state.tokens.curr, v);
						}
						return true;
					}
					return false;
				}
				};
	};


	// Parse JSON

	function jsonValue() {

		function jsonObject() {
			var o = {}, t = state.tokens.next;
			advance("{");
			if (state.tokens.next.id !== "}") {
				for (;;) {
					if (state.tokens.next.id === "(end)") {
						error("E026", state.tokens.next, t.line);
					} else if (state.tokens.next.id === "}") {
						warning("W094", state.tokens.curr);
						break;
					} else if (state.tokens.next.id === ",") {
						error("E028", state.tokens.next);
					} else if (state.tokens.next.id !== "(string)") {
						warning("W095", state.tokens.next, state.tokens.next.value);
					}
					if (o[state.tokens.next.value] === true) {
						warning("W075", state.tokens.next, state.tokens.next.value);
					} else if ((state.tokens.next.value === "__proto__" &&
						!state.option.proto) || (state.tokens.next.value === "__iterator__" &&
						!state.option.iterator)) {
						warning("W096", state.tokens.next, state.tokens.next.value);
					} else {
						o[state.tokens.next.value] = true;
					}
					advance();
					advance(":");
					jsonValue();
					if (state.tokens.next.id !== ",") {
						break;
					}
					advance(",");
				}
			}
			advance("}");
		}

		function jsonArray() {
			var t = state.tokens.next;
			advance("[");
			if (state.tokens.next.id !== "]") {
				for (;;) {
					if (state.tokens.next.id === "(end)") {
						error("E027", state.tokens.next, t.line);
					} else if (state.tokens.next.id === "]") {
						warning("W094", state.tokens.curr);
						break;
					} else if (state.tokens.next.id === ",") {
						error("E028", state.tokens.next);
					}
					jsonValue();
					if (state.tokens.next.id !== ",") {
						break;
					}
					advance(",");
				}
			}
			advance("]");
		}

		switch (state.tokens.next.id) {
		case "{":
			jsonObject();
			break;
		case "[":
			jsonArray();
			break;
		case "true":
		case "false":
		case "null":
		case "(number)":
		case "(string)":
			advance();
			break;
		case "-":
			advance("-");
			if (state.tokens.curr.character !== state.tokens.next.from) {
				warning("W011", state.tokens.curr);
			}
			adjacent(state.tokens.curr, state.tokens.next);
			advance("(number)");
			break;
		default:
			error("E003", state.tokens.next);
		}
	}

	var blockScope = function () {
		var _current = {};
		var _variables = [_current];

		function _checkBlockLabels() {
			for (var t in _current) {
				if (_current[t]["(type)"] === "unused") {
					if (state.option.unused) {
						var tkn = _current[t]["(token)"];
						var line = tkn.line;
						var chr  = tkn.character;
						warningAt("W098", line, chr, t);
					}
				}
			}
		}

		return {
			stack: function () {
				_current = {};
				_variables.push(_current);
			},

			unstack: function () {
				_checkBlockLabels();
				_variables.splice(_variables.length - 1, 1);
				_current = _.last(_variables);
			},

			getlabel: function (l) {
				for (var i = _variables.length - 1 ; i >= 0; --i) {
					if (_.has(_variables[i], l)) {
						return _variables[i];
					}
				}
			},

			current: {
				has: function (t) {
					return _.has(_current, t);
				},
				add: function (t, type, tok) {
					_current[t] = { "(type)" : type,
									"(token)": tok };
				}
			}
		};
	};

	// The actual JSHINT function itself.
	var itself = function (s, o, g) {
		var i, k, x;
		var optionKeys;
		var newOptionObj = {};
		var newIgnoredObj = {};

		state.reset();

		if (o && o.scope) {
			JSHINT.scope = o.scope;
		} else {
			JSHINT.errors = [];
			JSHINT.undefs = [];
			JSHINT.internals = [];
			JSHINT.blacklist = {};
			JSHINT.scope = "(main)";
		}

		predefined = Object.create(null);
		combine(predefined, vars.ecmaIdentifiers);
		combine(predefined, vars.reservedVars);

		combine(predefined, g || {});

		declared = Object.create(null);
		exported = Object.create(null);

		function each(obj, cb) {
			if (!obj)
				return;

			if (!Array.isArray(obj) && typeof obj === "object")
				obj = Object.keys(obj);

			obj.forEach(cb);
		}

		if (o) {
			each(o.predef || null, function (item) {
				var slice, prop;

				if (item[0] === "-") {
					slice = item.slice(1);
					JSHINT.blacklist[slice] = slice;
				} else {
					prop = Object.getOwnPropertyDescriptor(o.predef, item);
					predefined[item] = prop ? prop.value : false;
				}
			});

			each(o.exported || null, function (item) {
				exported[item] = true;
			});

			delete o.predef;
			delete o.exported;

			optionKeys = Object.keys(o);
			for (x = 0; x < optionKeys.length; x++) {
				if (/^-W\d{3}$/g.test(optionKeys[x])) {
					newIgnoredObj[optionKeys[x].slice(1)] = true;
				} else {
					newOptionObj[optionKeys[x]] = o[optionKeys[x]];

					if (optionKeys[x] === "newcap" && o[optionKeys[x]] === false)
						newOptionObj["(explicitNewcap)"] = true;

					if (optionKeys[x] === "indent")
						newOptionObj["(explicitIndent)"] = o[optionKeys[x]] === false ? false : true;
				}
			}
		}

		state.option = newOptionObj;
		state.ignored = newIgnoredObj;

		state.option.indent = state.option.indent || 4;
		state.option.maxerr = state.option.maxerr || 50;

		indent = 1;
		global = Object.create(predefined);
		scope = global;
		funct = {
			"(global)":   true,
			"(name)":	  "(global)",
			"(scope)":	  scope,
			"(breakage)": 0,
			"(loopage)":  0,
			"(tokens)":   {},
			"(metrics)":   createMetrics(state.tokens.next),
			"(blockscope)": blockScope(),
			"(comparray)": arrayComprehension()
		};
		functions = [funct];
		urls = [];
		stack = null;
		member = {};
		membersOnly = null;
		implied = {};
		inblock = false;
		lookahead = [];
		warnings = 0;
		unuseds = [];

		if (!isString(s) && !Array.isArray(s)) {
			errorAt("E004", 0);
			return false;
		}

		api = {
			get isJSON() {
				return state.jsonMode;
			},

			getOption: function (name) {
				return state.option[name] || null;
			},

			getCache: function (name) {
				return state.cache[name];
			},

			setCache: function (name, value) {
				state.cache[name] = value;
			},

			warn: function (code, data) {
				warningAt.apply(null, [ code, data.line, data.char ].concat(data.data));
			},

			on: function (names, listener) {
				names.split(" ").forEach(function (name) {
					emitter.on(name, listener);
				}.bind(this));
			}
		};

		emitter.removeAllListeners();
		(extraModules || []).forEach(function (func) {
			func(api);
		});

		state.tokens.prev = state.tokens.curr = state.tokens.next = state.syntax["(begin)"];

		lex = new Lexer(s);

		lex.on("warning", function (ev) {
			warningAt.apply(null, [ ev.code, ev.line, ev.character].concat(ev.data));
		});

		lex.on("error", function (ev) {
			errorAt.apply(null, [ ev.code, ev.line, ev.character ].concat(ev.data));
		});

		lex.on("fatal", function (ev) {
			quit("E041", ev.line, ev.from);
		});

		lex.on("Identifier", function (ev) {
			emitter.emit("Identifier", ev);
		});

		lex.on("String", function (ev) {
			emitter.emit("String", ev);
		});

		lex.on("Number", function (ev) {
			emitter.emit("Number", ev);
		});

		lex.start();

		// Check options
		for (var name in o) {
			if (_.has(o, name)) {
				checkOption(name, state.tokens.curr);
			}
		}

		assume();

		// combine the passed globals after we've assumed all our options
		combine(predefined, g || {});

		//reset values
		comma.first = true;

		try {
			advance();
			switch (state.tokens.next.id) {
			case "{":
			case "[":
				destructuringAssignOrJsonValue();
				break;
			default:
				directives();

				if (state.directive["use strict"]) {
					if (!state.option.globalstrict && !(state.option.node || state.option.phantom)) {
						warning("W097", state.tokens.prev);
					}
				}

				statements();
			}
			advance((state.tokens.next && state.tokens.next.value !== ".")	? "(end)" : undefined);
			funct["(blockscope)"].unstack();

			var markDefined = function (name, context) {
				do {
					if (typeof context[name] === "string") {
						// JSHINT marks unused variables as 'unused' and
						// unused function declaration as 'unction'. This
						// code changes such instances back 'var' and
						// 'closure' so that the code in JSHINT.data()
						// doesn't think they're unused.

						if (context[name] === "unused")
							context[name] = "var";
						else if (context[name] === "unction")
							context[name] = "closure";

						return true;
					}

					context = context["(context)"];
				} while (context);

				return false;
			};

			var clearImplied = function (name, line) {
				if (!implied[name])
					return;

				var newImplied = [];
				for (var i = 0; i < implied[name].length; i += 1) {
					if (implied[name][i] !== line)
						newImplied.push(implied[name][i]);
				}

				if (newImplied.length === 0)
					delete implied[name];
				else
					implied[name] = newImplied;
			};

			var warnUnused = function (name, tkn, type, unused_opt) {
				var line = tkn.line;
				var chr  = tkn.character;

				if (unused_opt === undefined) {
					unused_opt = state.option.unused;
				}

				if (unused_opt === true) {
					unused_opt = "last-param";
				}

				var warnable_types = {
					"vars": ["var"],
					"last-param": ["var", "param"],
					"strict": ["var", "param", "last-param"]
				};

				if (unused_opt) {
					if (warnable_types[unused_opt] && warnable_types[unused_opt].indexOf(type) !== -1) {
						warningAt("W098", line, chr, name);
					}
				}

				unuseds.push({
					name: name,
					line: line,
					character: chr
				});
			};

			var checkUnused = function (func, key) {
				var type = func[key];
				var tkn = func["(tokens)"][key];

				if (key.charAt(0) === "(")
					return;

				if (type !== "unused" && type !== "unction")
					return;

				// Params are checked separately from other variables.
				if (func["(params)"] && func["(params)"].indexOf(key) !== -1)
					return;

				// Variable is in global scope and defined as exported.
				if (func["(global)"] && _.has(exported, key)) {
					return;
				}

				warnUnused(key, tkn, "var");
			};

			// Check queued 'x is not defined' instances to see if they're still undefined.
			for (i = 0; i < JSHINT.undefs.length; i += 1) {
				k = JSHINT.undefs[i].slice(0);

				if (markDefined(k[2].value, k[0])) {
					clearImplied(k[2].value, k[2].line);
				} else if (state.option.undef) {
					warning.apply(warning, k.slice(1));
				}
			}

			functions.forEach(function (func) {
				if (func["(unusedOption)"] === false) {
					return;
				}

				for (var key in func) {
					if (_.has(func, key)) {
						checkUnused(func, key);
					}
				}

				if (!func["(params)"])
					return;

				var params = func["(params)"].slice();
				var param  = params.pop();
				var type, unused_opt;

				while (param) {
					type = func[param];
					unused_opt = func["(unusedOption)"] || state.option.unused;
					unused_opt = unused_opt === true ? "last-param" : unused_opt;

					// 'undefined' is a special case for (function (window, undefined) { ... })();
					// patterns.

					if (param === "undefined")
						return;

					if (type === "unused" || type === "unction") {
						warnUnused(param, func["(tokens)"][param], "param", func["(unusedOption)"]);
					} else if (unused_opt === "last-param") {
						return;
					}

					param = params.pop();
				}
			});

			for (var key in declared) {
				if (_.has(declared, key) && !_.has(global, key)) {
					warnUnused(key, declared[key], "var");
				}
			}

		} catch (err) {
			if (err && err.name === "JSHintError") {
				var nt = state.tokens.next || {};
				JSHINT.errors.push({
					scope     : "(main)",
					raw       : err.raw,
					code      : err.code,
					reason    : err.message,
					line      : err.line || nt.line,
					character : err.character || nt.from
				}, null);
			} else {
				throw err;
			}
		}

		// Loop over the listed "internals", and check them as well.

		if (JSHINT.scope === "(main)") {
			o = o || {};

			for (i = 0; i < JSHINT.internals.length; i += 1) {
				k = JSHINT.internals[i];
				o.scope = k.elem;
				itself(k.value, o, g);
			}
		}

		return JSHINT.errors.length === 0;
	};

	// Modules.
	itself.addModule = function (func) {
		extraModules.push(func);
	};

	itself.addModule(style.register);

	// Data summary.
	itself.data = function () {
		var data = {
			functions: [],
			options: state.option
		};

		var implieds = [];
		var members = [];
		var fu, f, i, j, n, globals;

		if (itself.errors.length) {
			data.errors = itself.errors;
		}

		if (state.jsonMode) {
			data.json = true;
		}

		for (n in implied) {
			if (_.has(implied, n)) {
				implieds.push({
					name: n,
					line: implied[n]
				});
			}
		}

		if (implieds.length > 0) {
			data.implieds = implieds;
		}

		if (urls.length > 0) {
			data.urls = urls;
		}

		globals = Object.keys(scope);
		if (globals.length > 0) {
			data.globals = globals;
		}

		for (i = 1; i < functions.length; i += 1) {
			f = functions[i];
			fu = {};

			for (j = 0; j < functionicity.length; j += 1) {
				fu[functionicity[j]] = [];
			}

			for (j = 0; j < functionicity.length; j += 1) {
				if (fu[functionicity[j]].length === 0) {
					delete fu[functionicity[j]];
				}
			}

			fu.name = f["(name)"];
			fu.param = f["(params)"];
			fu.line = f["(line)"];
			fu.character = f["(character)"];
			fu.last = f["(last)"];
			fu.lastcharacter = f["(lastcharacter)"];

			fu.metrics = {
				complexity: f["(metrics)"].ComplexityCount,
				parameters: (f["(params)"] || []).length,
				statements: f["(metrics)"].statementCount
			};

			data.functions.push(fu);
		}

		if (unuseds.length > 0) {
			data.unused = unuseds;
		}

		members = [];
		for (n in member) {
			if (typeof member[n] === "number") {
				data.member = member;
				break;
			}
		}

		return data;
	};

	itself.jshint = itself;

	return itself;
}());

// Make JSHINT a Node module, if possible.
if (typeof exports === "object" && exports) {
	exports.JSHINT = JSHINT;
}
