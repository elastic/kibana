define([], function () {
	function MockConsole(hasGrouping) {
		this.messages = {};
		var methods = [ 'log', 'info', 'warn', 'error' ];
		if (hasGrouping) {
			methods.push('group', 'groupEnd');
		}
		methods.forEach(function (method) {
			this.messages[method] = [];
			this[method] = function () {
				this.messages[method].push(Array.prototype.slice.call(arguments, 0).join(' '));
			};
		}, this);
	}

	return MockConsole;
});
