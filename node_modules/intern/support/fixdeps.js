/*jshint node:true */
var fs = require('fs');
var path = require('path');
var expected = path.join(__dirname, '..', 'node_modules');

// Create the node_modules directory if it doesn't yet exist, such as when all of
// Intern's dependencies were already installed by a parent package.
if (!fs.existsSync(expected)) {
	fs.mkdirSync(expected);
}

// AMD-loaded dependencies need to exist in Intern's node_modules directory,
// regardless of whether or not they were deduped by npm
[ 'dojo', 'chai', 'diff' ].forEach(function (dependency) {
	var expectedPath = path.join(expected, dependency);

	// Reset any existing dependency symlinks in case the location of the
	// deduplicated package has changed
	try {
		if (fs.lstatSync(expectedPath).isSymbolicLink()) {
			fs.unlinkSync(expectedPath);
		}
	}
	catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}

	var actualPath = path.dirname(require.resolve(path.join(dependency, 'package.json')));

	if (actualPath.indexOf(expectedPath) !== 0) {
		fs.symlinkSync(actualPath, expectedPath, 'dir');
	}
});
