var Promise = require('dojo/Promise');
var statusCodes = require('./statusCodes');

module.exports = {
	applyTo: function (prototype) {
		prototype.waitForDeleted = function (strategy, value) {
			var self = this;
			var session = this.session || this;
			var originalTimeout;

			return session.getTimeout('implicit').then(function (value) {
				originalTimeout = value;
				return session.setTimeout('implicit', 0);
			}).then(function () {
				var dfd = new Promise.Deferred();
				var startTime = Date.now();

				(function poll() {
					if (Date.now() - startTime > originalTimeout) {
						var always = function () {
							var error = new Error();
							error.status = 21;
							error.name = statusCodes[error.status][0];
							error.message = statusCodes[error.status][1];
							dfd.reject(error);
						};
						session.setTimeout('implicit', originalTimeout).then(always, always);
						return;
					}

					self.find(strategy, value).then(poll, function (error) {
						var always = function () {
							/* istanbul ignore else: other errors should never occur during normal operation */
							if (error.name === 'NoSuchElement') {
								dfd.resolve();
							}
							else {
								dfd.reject(error);
							}
						};
						session.setTimeout('implicit', originalTimeout).then(always, always);
					});
				})();

				return dfd.promise;
			});
		};
	}
};
