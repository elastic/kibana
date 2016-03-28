define([
	'dojo/has',
	'dojo/lang',
	'dojo/Promise',
	'./EnvironmentType',
	'diff',
	'dojo/has!host-node?dojo/node!path',
	'dojo/has!host-node?dojo/node!istanbul/lib/hook',
	'dojo/has!host-node?dojo/node!istanbul/lib/instrumenter',
	'dojo/has!host-node?dojo/node!source-map',
	'dojo/has!host-node?dojo/node!fs'
], function (
	has,
	lang,
	Promise,
	EnvironmentType,
	diffUtil,
	pathUtil,
	hook,
	Instrumenter,
	sourceMap,
	fs
) {
	has.add('function-name', function () {
		function foo() {}
		return foo.name === 'foo';
	});

	var instrumentationSourceMap = {};
	var fileSourceMaps = {};
	var fileSources = {};
	var instrumenters = {};

	/**
	 * Creates a serialised representation of an object.
	 *
	 * @param {Object} object The object to serialise.
	 * @returns {string} A canonical, serialised representation of the object.
	 */
	function serialize(object) {
		var indent = '';
		var output = '';
		var stack = [];

		function writeDate(value) {
			output += value.toISOString();
		}

		function writeObject(object) {
			// jshint maxcomplexity:12

			if (stack.indexOf(object) > -1) {
				output += '[Circular]';
				return;
			}

			var isArray = Array.isArray(object);
			var isFunction = typeof object === 'function';

			if (isArray) {
				output += '[';
			}
			else if (isFunction) {
				output += (has('function-name') ? (object.name || '<anonymous>') : '<function>') + '({';
			}
			else {
				output += '{';
			}

			var keys = Object.keys(object);

			if (keys.length || isArray) {
				stack.push(object);
				indent += '  ';

				keys.sort(function (a, b) {
					// Sort numeric keys to the top, in numeric order, to display arrays in their natural sort order
					if (!isNaN(a) && !isNaN(b)) {
						return a - b;
					}

					if (!isNaN(a) && isNaN(b)) {
						return -1;
					}

					if (isNaN(a) && !isNaN(b)) {
						return 1;
					}

					if (a < b) {
						return -1;
					}

					if (a > b) {
						return 1;
					}

					return 0;
				}).forEach(function (key, index) {
					output += (index > 0 ? ',' : '') + '\n' + indent;
					isArray && !isNaN(key) ? writePrimitive(key) : writeString(key);
					output += ': ';
					write(object[key]);
				});

				if (isArray) {
					output += (keys.length ? ',' : '') + '\n' + indent;
					writePrimitive('length');
					output += ': ';
					write(object.length);
				}

				output += '\n';
				indent = indent.slice(0, -2);
				stack.pop();

				output += indent;
			}

			if (isArray) {
				output += ']';
			}
			else if (isFunction) {
				output += '})';
			}
			else {
				output += '}';
			}
		}

		function writePrimitive(value) {
			output += String(value);
		}

		function writeString(value) {
			output += JSON.stringify(String(value));
		}

		function write(value) {
			switch (typeof value) {
				case 'object':
				case 'function':
					if (value === null) {
						writePrimitive(value);
					}
					else if (value instanceof Date) {
						writeDate(value);
					}
					else if (value instanceof RegExp) {
						writePrimitive(value);
					}
					else {
						writeObject(value);
					}
					break;
				case 'string':
					writeString(value);
					break;
				default:
					writePrimitive(value);
					break;
			}
		}

		write(object);
		return output;
	}

	/**
	 * Creates a unified diff to explain the difference between two objects.
	 *
	 * @param {Object} actual The actual result.
	 * @param {Object} expected The expected result.
	 * @returns {string} A unified diff formatted string representing the difference between the two objects.
	 */
	function createDiff(actual, expected) {
		actual = serialize(actual);
		expected = serialize(expected);

		var diff = diffUtil
			.createPatch('', actual + '\n', expected + '\n')
			// diff header, first range information section, and EOF newline are not relevant for serialised object
			// diffs
			.split('\n')
			.slice(5, -1)
			.join('\n')
			// range information is not relevant for serialised object diffs
			.replace(/^@@[^@]*@@$/gm, '[...]');

		// If the diff is empty now, running the next replacement will cause it to have some extra whitespace, which
		// makes it harder than it needs to be for callers to know if the diff is empty
		if (diff) {
			// + and - are not super clear about which lines are the expected object and which lines are the actual
			// object, and bump directly into code with no indentation, so replace the characters and add space
			diff = diff.replace(/^([+-]?)(.*)$/gm, function (_, indicator, line) {
				if (line === '[...]') {
					return line;
				}

				return (indicator === '+' ? 'E' : indicator === '-' ? 'A' : '') + ' ' + line;
			});
		}

		return diff;
	}

	/**
	 * Return the instrumenter, creating it if necessary.
	 */
	function getInstrumenter(coverageVariable) {
		if (!instrumenters[coverageVariable]) {
			instrumenters[coverageVariable] = new Instrumenter({
				// coverage variable is changed primarily to avoid any jshint complaints, but also to make
				// it clearer where the global is coming from
				coverageVariable: coverageVariable,

				// compacting code makes it harder to look at but it does not really matter
				noCompact: true,

				// auto-wrap breaks code
				noAutoWrap: true
			});
		}
		return instrumenters[coverageVariable];
	}

	/**
	 * Return a new SourceMapConsumer for a given source map string.
	 */
	function loadSourceMap(data) {
		return new sourceMap.SourceMapConsumer(data);
	}

	/**
	 * Get the original position of line:column based on map.
	 *
	 * Assumes mappings are is in order by generatedLine, then by generatedColumn; maps created with
	 * SourceMapConsumer.eachMapping should be in this order by default.
	 */
	function getOriginalPosition(map, line, column) {
		var originalPosition = map.originalPositionFor({ line: line, column: column});

		// if the SourceMapConsumer was able to find a location, return it
		if (originalPosition.line !== null) {
			return originalPosition;
		}

		var entries = [];

		// find all map entries that apply to the given line in the generated output
		map.eachMapping(function (entry) {
			if (entry.generatedLine === line) {
				entries.push(entry);
			}
		}, null, map.GENERATED_ORDER);

		if (entries.length === 0) {
			// no valid mappings exist -- return the line and column arguments
			return { line: line, column: column };
		}

		originalPosition = entries[0];

		// Chrome/Node.js column is at the start of the term that generated the exception
		// IE column is at the beginning of the expression/line with the exceptional term
		// Safari column number is just after the exceptional term
		//   - need to go back one element in the mapping
		// Firefox, PhantomJS have no column number
		//   - for no col number, find the largest original line number for the generated line

		if (column !== null) {
			// find the most likely mapping for the given generated line and column
			var entry;
			for (var i = 1; i < entries.length; i++) {
				entry = entries[i];
				if (column > originalPosition.generatedColumn && column >= entry.generatedColumn) {
					originalPosition = entry;
				}
			}
		}

		return {
			line: originalPosition.originalLine,
			column: originalPosition.originalColumn,
			source: originalPosition.source
		};
	}

	/**
	 * Load and process the source map for a given file.
	 */
	function getSourceMap(filepath) {
		var data;
		var lines;
		var lastLine;
		var match;

		if (filepath in fileSourceMaps) {
			return fileSourceMaps[filepath];
		}

		try {
			if (filepath in fileSources) {
				data = fileSources[filepath];
			}
			else {
				data = fs.readFileSync(filepath).toString('utf-8');
				fileSources[filepath] = data;
			}

			lines = data.trim().split('\n');
			lastLine = lines[lines.length - 1];

			if ((match = /\/\/[@#] sourceMappingURL=(.*)$/.exec(lastLine))) {
				// treat map file path as relative to the source file
				var mapFile = pathUtil.join(pathUtil.dirname(filepath), match[1]);
				if (!(mapFile in fileSourceMaps)) {
					data = fs.readFileSync(mapFile);
					fileSourceMaps[mapFile] = loadSourceMap(data.toString('utf-8'));
				}
				return fileSourceMaps[mapFile];
			}
		}
		catch (error) {
			// this is normal for files like node.js -- just return null
			return null;
		}
	}

	/**
	 * Dereference the source from a traceline.
	 */
	function getSource(tracepath) {
		/* jshint maxcomplexity:13 */
		var match;
		var source;
		var line;
		var col;
		var map;
		var originalPos;
		var result;

		if (tracepath === '<anonymous>') {
			return 'anonymous';
		}

		if (!(match = /^(.*?):(\d+)(:\d+)?$/.exec(tracepath))) {
			// no line or column data
			return tracepath;
		}

		tracepath = match[1];
		line = Number(match[2]);
		col = match[3] ? Number(match[3].substring(1)) : null;

		// strip the host when we have a URL

		if ((match = /^\w+:\/\/[^\/]+\/(.*)$/.exec(tracepath))) {
			// resolve the URL path to a filesystem path
			tracepath = pathUtil ? pathUtil.resolve(match[1]) : match[1];
		}

		if (has('host-browser')) {
			// no further processing in browser environments
			return tracepath + ':' + line + (col == null ? '' : ':' + col);
		}

		source = pathUtil.relative('.', tracepath);

		// first, check for an instrumentation source map
		if (tracepath in instrumentationSourceMap) {
			map = instrumentationSourceMap[tracepath];
			originalPos = getOriginalPosition(map, line, col);
			line = originalPos.line;
			col = originalPos.column;
			if (originalPos.source) {
				source = originalPos.source;
			}
		}

		// next, check for original source map
		if ((map = getSourceMap(tracepath))) {
			originalPos = getOriginalPosition(map, line, col);
			line = originalPos.line;
			col = originalPos.column;
			if (originalPos.source) {
				source = pathUtil.join(pathUtil.dirname(source), originalPos.source);
			}
		}

		result = source + ':' + line;
		if (col !== null) {
			result += ':' + col;
		}
		return result;
	}

	/**
	 * Return a trace line in a standardized format.
	 */
	function formatLine(data) {
		if (!data.func) {
			return '  at <' + getSource(data.source) + '>';
		}
		return '  at ' + data.func + '  <' + getSource(data.source) + '>';
	}

	/**
	 * Process Chrome, Opera, and IE traces.
	 */
	function processChromeTrace(lines) {
		var stack = [];
		var match;
		var line;
		for (var i = 0; i < lines.length; i++) {
			line = lines[i];
			if ((match = /^\s*at (.+?) \(([^)]+)\)$/.exec(line))) {
				stack.push(formatLine({ func: match[1], source: match[2] }));
			}
			else if ((match = /^\s*at (.*)/.exec(line))) {
				stack.push(formatLine({ source: match[1] }));
			}
			else {
				stack.push(line);
			}
		}
		return stack;
	}

	/**
	 * Process Safari and Firefox traces.
	 */
	function processSafariTrace(lines) {
		var stack = [];
		var match;
		var line;
		for (var i = 0; i < lines.length; i++) {
			line = lines[i];
			if ((match = /^([^@]+)@(.*)/.exec(line))) {
				stack.push(formatLine({ func: match[1], source: match[2] }));
			}
			else if ((match = /^(\w+:\/\/.*)/.exec(line))) {
				stack.push(formatLine({ source: match[1] }));
			}
			else {
				stack.push(line);
			}
		}
		return stack;
	}

	/**
	 * Parse a stack trace, apply any source mappings, and normalize its format.
	 */
	function normalizeStackTrace(stack) {
		var lines = stack.replace(/\s+$/, '').split('\n');
		var firstLine = '';

		if (/^(?:[A-Z]\w+)?Error: /.test(lines[0])) {
			// ignore the first line if it's just the Error name
			firstLine = lines[0] + '\n';
			lines = lines.slice(1);
		}

		// strip leading blank lines
		while (/^\s*$/.test(lines[0])) {
			lines = lines.slice(1);
		}

		stack = /^\s*at /.test(lines[0]) ? processChromeTrace(lines) : processSafariTrace(lines);
		return '\n' + firstLine + stack.join('\n');
	}

	/**
	 * @borrows serialize as serialize
	 */
	return {
		serialize: serialize,

		assertSafeModuleId: function (moduleId) {
			if (/^(?:\w+:)?\/\//.test(moduleId)) {
				throw new Error('Cross-origin loading of test modules is not allowed for security reasons');
			}
		},

		/**
		 * Creates a basic FIFO function queue to limit the number of currently executing asynchronous functions.
		 *
		 * @param maxConcurrency Number of functions to execute at once.
		 * @returns {function(callee:Function)} A function that can be used to push new functions onto the queue.
		 */
		createQueue: function (/**number*/ maxConcurrency) {
			var numCalls = 0;
			var queue = [];

			function shiftQueue() {
				if (queue.length) {
					var callee = queue.shift();
					Promise.resolve(callee[0].apply(callee[1], callee[2])).finally(shiftQueue);
				}
				else {
					--numCalls;
				}
			}

			// Returns a function to wrap callback function in this queue
			var queuer = function (callee) {
				// Calling the wrapped function either executes immediately if possible,
				// or pushes onto the queue if not
				return function () {
					if (numCalls < maxConcurrency) {
						++numCalls;
						Promise.resolve(callee.apply(this, arguments)).finally(shiftQueue);
					}
					else {
						queue.push([ callee, this, arguments ]);
					}
				};
			};

			queuer.empty = function () {
				queue = [];
				numCalls = 0;
			};

			return queuer;
		},

		escapeRegExp: function (string) {
			return String(string).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
		},

		/**
		 * Flattens an array of environment definition objects with maybe-array browserName, browserVersion,
		 * platformName, and platformVersion properties into an array of EnvironmentType objects with scalar values
		 * matching all possible permutations.
		 *
		 * @returns {Array.<EnvironmentType>} Flattened list of browser criteria.
		 */
		flattenEnvironments: function (/**Object*/ capabilities, /**Array*/ environments) {
			// TODO: Allow arbitrary permutations

			var permutations = [];

			environments.forEach(function (environment) {
				var browserNames = [].concat(environment.browserName);
				var browserVersions = [].concat(environment.version);
				var platformNames = [].concat(environment.platform);
				var platformVersions = [].concat(environment.platformVersion);

				browserNames.forEach(function (browserName) {
					browserVersions.forEach(function (browserVersion) {
						platformNames.forEach(function (platformName) {
							platformVersions.forEach(function (platformVersion) {
								var environmentCapabilities = Object.create(capabilities);

								lang.mixin(environmentCapabilities, environment, {
									browserName: browserName,
									version: browserVersion,
									platform: platformName,
									platformVersion: platformVersion
								});

								permutations.push(new EnvironmentType(environmentCapabilities));
							});
						});
					});
				});
			});

			return permutations;
		},

		/**
		 * Generates a full error message from a plain Error object, avoiding duplicate error messages that might be
		 * caused by different opinions on what a stack trace should look like.
		 *
		 * @param {Error} error An object describing the error.
		 * @returns {string} A string message describing the error.
		 */
		getErrorMessage: function (error) {
			/* jshint maxcomplexity:14 */
			if (error.message || error.stack) {
				var message = (error.name || 'Error') + ': ' + (error.message || 'Unknown error');
				var stack = error.stack;

				if (stack) {
					// V8 puts the original error at the top of the stack too; avoid redundant output that may
					// cause confusion about how many times an assertion was actually called
					if (stack.indexOf(message) === 0) {
						stack = stack.slice(message.length);
					}
					else if (stack.indexOf(error.message) === 0) {
						stack = stack.slice(String(error.message).length);
					}

					stack = normalizeStackTrace(stack);
				}

				if (error.showDiff && typeof error.actual === 'object' && typeof error.expected === 'object') {
					var diff = createDiff(error.actual, error.expected);
					if (diff) {
						message += '\n\n' + diff + '\n';
					}
				}

				if (stack && /\S/.test(stack)) {
					message += stack;
				}
				else if (error.fileName) {
					message += '\n  at ' + error.fileName;
					if (error.lineNumber != null) {
						message += ':' + error.lineNumber;

						if (error.columnNumber != null) {
							message += ':' + error.columnNumber;
						}
					}

					message += '\nNo stack';
				}
				else {
					message += '\nNo stack or location';
				}

				return message;
			}
			else {
				return String(error);
			}
		},

		getModule: function (moduleId, loader) {
			return this.getModules([ moduleId ], loader).then(function (modules) {
				return modules[0];
			});
		},

		getModules: function (moduleIds, loader) {
			/* global require:false */
			if (!loader) {
				loader = require;
			}

			return new Promise(function (resolve, reject) {
				loader(moduleIds, function () {
					resolve(Array.prototype.slice.call(arguments, 0));
				}, reject);
			});
		},

		getShouldWait: function (waitMode, message) {
			var shouldWait = false;
			if (waitMode === 'fail') {
				var eventName = message[0];
				if (
					eventName === 'testFail' ||
					eventName === 'suiteError' ||
					eventName === 'fatalError'
				) {
					shouldWait = true;
				}
			}
			else if (waitMode) {
				shouldWait = true;
			}

			return waitMode;
		},

		normalizePath: function (path) {
			if (pathUtil) {
				return pathUtil.normalize(path).replace(/\\/g, '/');
			}

			var parts = path.replace(/\\/g, '/').split('/');
			var result = [];
			for (var i = 0; i < parts.length; ++i) {
				var part = parts[i];

				if (!part || part === '.') {
					if (i === 0 || i === parts.length - 1) {
						result.push('');
					}

					continue;
				}

				if (part === '..') {
					if (result.length && result[result.length - 1] !== '..') {
						result.pop();
					}
					else {
						result.push(part);
					}
				}
				else {
					result.push(part);
				}
			}

			return result.join('/');
		},

		normalizePathForInstrumentation: function (filename) {
			filename = pathUtil.normalize(filename);
			if (pathUtil.sep === '\\') {
				filename = filename.replace(/\\/g, '/');
			}
			return filename;
		},

		retry: function (callback, numRetries) {
			var numAttempts = 0;
			return callback().catch(function retry(error) {
				if (error.name !== 'CancelError' && ++numAttempts <= numRetries) {
					return callback().catch(retry);
				}
				else {
					throw error;
				}
			});
		},

		/**
		 * Adds hooks for code coverage instrumentation in the Node.js loader.
		 *
		 * @param {Object} config The main Intern configuration.
		 * @param {Object} instrumenter The code instrumenter.
		 * @param {string} basePath The base path for all code.
		 */
		setInstrumentationHooks: function (excludeInstrumentation, basePath, coverageVariable) {
			var self = this;

			function hookMatcher(filename) {
				filename = self.normalizePath(filename);

				return !excludeInstrumentation || (
					filename.indexOf(basePath) === 0 &&
					// if the string passed to `excludeInstrumentation` changes here, it must also change in
					// `lib/Proxy.js`
					!excludeInstrumentation.test(filename.slice(basePath.length))
				);
			}

			function hookTransformer(code, filename) {
				return self.instrument(code, pathUtil.resolve(filename), coverageVariable);
			}

			hook.hookRunInThisContext(hookMatcher, hookTransformer);
			hook.hookRequire(hookMatcher, hookTransformer);

			return {
				remove: function () {
					this.remove = function () {};
					hook.unhookRunInThisContext();
					hook.unhookRequire();
				}
			};
		},

		/**
		 * Instrument a given file, saving its coverage source map.
		 *
		 * @param filedata Text of file being instrumented
		 * @param filepath Full path of file being instrumented
		 *
		 * @returns {string} A string of instrumented code
		 */
		instrument: function (filedata, filepath, coverageVariable) {
			var instrumenter = getInstrumenter(coverageVariable);
			var opts = instrumenter.opts;
			opts.codeGenerationOptions = {
				sourceMap: pathUtil.normalize(filepath),
				sourceMapWithCode: true
			};
			var code = instrumenter.instrumentSync(filedata, pathUtil.normalize(filepath));
			var map = instrumenter.lastSourceMap();

			if (map) {
				instrumentationSourceMap[filepath] = loadSourceMap(map.toString());
				fileSources[filepath] = filedata;
			}

			return code;
		}
	};
});
