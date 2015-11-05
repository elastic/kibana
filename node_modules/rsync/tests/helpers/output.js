"use strict";
/* jshint strict: true */
var assert = require('chai').assert;

var output = module.exports;

/**
 * Assert the exact output of a command against an expectation.
 *
 * @param {Rsync|Function} command
 * @param {String|Function} expectation
 * @param {String} message
 */
output.assertOutput = function (command, expectation, message) {
  command     = isFunction(command) ? command() : command;
  expectation = isFunction(expectation) ? expectation() : expectation;
  message     = message || 'expected |' + command.command() + '| to equal |' + expectation + '|';

  return assert.strictEqual(command.command(), expectation, message);
};
output.assertExactOutput = output.assertOutput;

/**
 * Assert the exact output of a command against an expectation.
 *
 * @param {Rsync|Function} command
 * @param {RegExp|Function} expectation
 * @param {String} message
 */
output.assertOutputPattern = function (command, expectation, message) {
  command     = isFunction(command) ? command() : command;
  expectation = isFunction(expectation) ? expectation() : expectation;
  message     = message || 'expected |' + command.command() + '| to match |' + String(expectation) + '|';

  return assert(expectation.test(command.command()), message);
};


function isFunction(input) {
  return typeof input === 'function';
}
