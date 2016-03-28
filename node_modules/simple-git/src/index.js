
var Git = require('./git');

var ChildProcess = require('child_process');
var Buffer = require('buffer').Buffer;

module.exports = function (baseDir) {
    return new Git(baseDir || process.cwd(), ChildProcess, Buffer);
};

