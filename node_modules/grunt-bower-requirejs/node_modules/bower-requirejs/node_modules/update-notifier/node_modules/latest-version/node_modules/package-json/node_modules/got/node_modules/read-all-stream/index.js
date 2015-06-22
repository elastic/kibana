'use strict';

module.exports = function read(stream, options, cb) {
	if (!stream) {
		throw new Error('stream argument is required');
	}

	if (typeof options === 'function') {
		cb = options;
		options = {};
	}

	if (typeof options === 'string' || options === undefined || options === null) {
		options = { encoding: options };
	}

	if (!cb) {
		throw new Error('callback argument is required');
	}

	var chunks = [];
	var len = 0;
	var err = null;

	stream.on('data', function (chunk) {
		chunks.push(chunk);
		len += chunk.length;
	});

	stream.once('error', function (error) {
		err = error;
	});

	stream.once('end', function () {
		var data = Buffer.concat(chunks, len);

		if (options.encoding !== null) {
			data = data.toString(options.encoding || 'utf-8');
		}

		cb(err, data);
	});
};
