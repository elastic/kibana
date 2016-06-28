define([], function () {
	return {
		run: function () {
			throw new Error('bar');
		}
	};
});
