const last = require('lodash.last');

const childProcess = jest.genMockFromModule('child_process');
childProcess.exec = jest.fn((...args) => last(args)());
module.exports = childProcess;
