define([], function () {
	function MockStream() {
		this.data = '';
	}

	MockStream.prototype.end = MockStream.prototype.write = function (data, encoding, callback) {
		this.data += data;
		callback && callback();
	};

	return MockStream;
});
