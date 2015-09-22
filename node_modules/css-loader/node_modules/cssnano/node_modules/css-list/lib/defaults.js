module.exports = function (callback) {
	return function (string, separators, cb) {
		if (!(separators instanceof Array)) {
			return callback(string, [' ', '\n', '\t', ',', '/'], separators);
		} else {
			return callback(string, separators, cb);
		}
	}
};