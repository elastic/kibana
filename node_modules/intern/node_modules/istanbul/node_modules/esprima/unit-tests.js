'use strict';

// Allow tests to pass even if the test directory has not been included
var fs = require('fs'),
    path = require('path');

fs.exists(path.join(__dirname, '/test'), function(exists) {
    if (exists) {
        require('./test/run.js');
    }
});
