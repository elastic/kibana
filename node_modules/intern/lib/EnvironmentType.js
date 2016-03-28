define([], function () {
	function EnvironmentType(kwArgs) {
		for (var k in kwArgs) {
			this[k] = kwArgs[k];
		}
	}

	EnvironmentType.prototype = {
		constructor: EnvironmentType,
		browserName: undefined,
		version: undefined,
		platform: undefined,
		platformVersion: undefined,
		toString: function () {
			var parts = [];

			parts.push(this.browserName || 'Any browser');
			this.version && parts.push(this.version);
			parts.push('on ' + (this.platform || 'any platform'));
			this.platformVersion && parts.push(this.platformVersion);

			return parts.join(' ');
		}
	};

	return EnvironmentType;
});
