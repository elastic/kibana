var Promise = require('dojo/Promise');
var statusCodes = require('./statusCodes');

module.exports = {
	applyTo: function (prototype) {
		prototype.findDisplayed = function (strategy, value) {
			var self = this;
			var session = this.session || this;

			return session.getTimeout('implicit').then(function (originalTimeout) {
				var startTime = Date.now();

				function poll() {
					return self.findAll(strategy, value).then(function (elements) {
						// Due to concurrency issues with at least ChromeDriver 2.16, each element must be tested one
						// at a time instead of using `Promise.all`
						var i = -1;
						function checkElement() {
							var element = elements[++i];
							if (element) {
								return element.isDisplayed().then(function (isDisplayed) {
									if (isDisplayed) {
										return element;
									}
									else {
										return checkElement();
									}
								});
							}
						}

						return Promise.resolve(checkElement()).then(function (element) {
							if (element) {
								return element;
							}
							else if (Date.now() - startTime > originalTimeout) {
								var error = new Error();
								error.status = elements.length ? 11 : 7;
								error.name = statusCodes[error.status][0];
								error.message = statusCodes[error.status][1];
								throw error;
							}
							else {
								return poll();
							}
						});
					});
				}

				return poll();
			});
		};
	}
};
