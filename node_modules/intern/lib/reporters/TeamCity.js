/**
 * This reporter enables Intern to interact with TeamCity.
 * http://confluence.jetbrains.com/display/TCD8/Build+Script+Interaction+with+TeamCity
 *
 * Portions of this module are based on functions from teamcity-service-messages:
 * https://github.com/pifantastic/teamcity-service-messages.
 */
define([], function () {
	function TeamCity(config) {
		config = config || {};

		this.output = config.output;
	}

	TeamCity.prototype = {
		/**
		 * Escape a string for TeamCity output.
		 *
		 * @param  {string} string
		 * @return {string}
		 *
		 * Based on Message.prototype.escape from teamcity-service-messages
		 */
		_escapeString: function (string) {
			var replacer = /['\n\r\|\[\]\u0100-\uffff]/g,
				map = {
					'\'': '|\'',
					'|': '||',
					'\n': '|n',
					'\r': '|r',
					'[': '|[',
					']': '|]'
				};

			return string.replace(replacer, function (character) {
				if (character in map) {
					return map[character];
				}
				if (/[^\u0000-\u00ff]/.test(character)) {
					return '|0x' + character.charCodeAt(0).toString(16);
				}
				return '';
			});
		},

		/**
		 * Output a TeamCity message.
		 *
		 * @param  {string} type
		 * @param  {Object}  args
		 *
		 * Based on Message.prototype.formatArgs from teamcity-service-messages
		 */
		_sendMessage: function (type, args) {
			var self = this;

			args.timestamp = new Date().toISOString().slice(0, -1);
			args = Object.keys(args).map(function (key) {
				var value = String(args[key]);
				return key + '=' + '\'' + self._escapeString(value) + '\'';
			}).join(' ');

			this.output.write('##teamcity[' + type + ' ' + args + ']\n');
		},

		testStart: function (test) {
			this._sendMessage('testStarted', { name: test.id, flowId: test.sessionId });
		},

		testSkip: function (test) {
			this._sendMessage('testIgnored', { name: test.id, flowId: test.sessionId });
		},

		testEnd: function (test) {
			this._sendMessage('testFinished', {
				name: test.id,
				duration: test.timeElapsed,
				flowId: test.sessionId
			});
		},

		testFail: function (test) {
			var message = {
				name: test.id,
				message: test.error.message,
				flowId: test.sessionId
			};

			if (test.error.actual && test.error.expected) {
				message.type = 'comparisonFailure';
				message.expected = test.error.expected;
				message.actual = test.error.actual;
			}

			this._sendMessage('testFailed', message);
		},

		suiteStart: function (suite) {
			if (!suite.parent) {
				return;
			}

			this._sendMessage('testSuiteStarted', {
				name: suite.id,
				startDate: new Date(),
				flowId: suite.sessionId
			});
		},

		suiteEnd: function (suite) {
			if (!suite.parent) {
				return;
			}

			this._sendMessage('testSuiteFinished', {
				name: suite.id,
				duration: suite.timeElapsed,
				flowId: suite.sessionId
			});
		}
	};

	return TeamCity;
});
