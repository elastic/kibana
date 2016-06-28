define([
	'./tdd'
], function (tdd) {
	function createValue(value) {
		return {
			value: value,
			enumerable: true,
			configurable: true,
			writable: true
		};
	}

	return Object.create(tdd, {
		describe: createValue(tdd.suite),
		it: createValue(tdd.test),
		suite: { value: undefined },
		test: { value: undefined }
	});
});
