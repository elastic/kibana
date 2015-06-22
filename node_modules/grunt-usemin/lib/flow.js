'use strict';
var _ = require('lodash');

//
// Encapsulate definition of a flow's steps, per block types
//
// The flowConfig parameter has the following form:
//
//  {
//    steps: {
//      js: ['bar', 'baz'],
//      css: ['foo']
//     }
//   }
//
var Flow = module.exports = function (flowConfig) {
  this._steps = flowConfig.steps || {};
  this._post = flowConfig.post || {};
};

//
// Returns the steps for the furnished block type
//
Flow.prototype.steps = function (blockType) {
  return this._steps[blockType] || [];
};

//
// Set the steps for the flow
//
Flow.prototype.setSteps = function (steps) {
  // FIXME: Check format !!!
  this._steps = steps;
};

//
// Returns the postprocessors for the furnished block type
//
Flow.prototype.post = function (blockType) {
  return this._post[blockType] || [];
};

//
// Set the post for the flow
//
Flow.prototype.setPost = function (post) {
  // FIXME: Check format !!!
  this._post = post;
};


//
// Returns all referenced block types (i.e. the union of the block types from
// steps and postprocessors)
//
Flow.prototype.blockTypes = function () {
  return _.union(_.keys(this._steps), _.keys(this._post));
};
