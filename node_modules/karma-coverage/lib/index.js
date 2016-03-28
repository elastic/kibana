// karma-coverage
// ==============
//
// Main entry point for the karma-coverage module.
// Exposes the preprocessor and reporter plugins.

module.exports = {
  'preprocessor:coverage': ['factory', require('./preprocessor')],
  'reporter:coverage': ['type', require('./reporter')]
}
