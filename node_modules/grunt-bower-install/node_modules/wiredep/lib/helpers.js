/*
 * helpers.js
 * https://github.com/stephenplusplus/wiredep
 *
 * Copyright (c) 2013 Stephen Sawchuk
 * Licensed under the MIT license.
 */

'use strict';

var chalk = require('chalk');


/**
 * Returns a set/get style internal storage bucket.
 *
 * @return {object} the API to set and retrieve data
 */
module.exports.createStore = function () {
  var bucket = {};

  /**
   * Sets a property on the store, with the given value.
   *
   * @param  {string} property  an identifier for the data
   * @param  {*}      value     the value of the data being stored
   * @return {function} the set function itself to allow chaining
   */
  var set = function (property, value) {
    bucket[property] = value;
    return set;
  };

  /**
   * Returns the store item asked for, otherwise all of the items.
   *
   * @param  {string|undefined} property  the property being requested
   * @return {*} the store item that was matched
   */
  var get = function (property) {
    if (!property) {
      return bucket;
    }

    return bucket[property];
  };

  return {
    set: set,
    get: get
  };
};


/**
 * Return just a property from an object.
 *
 * @param  {string} prop  the key of the object to return
 * @return {function}
 */
module.exports.prop = function (prop) {
  return function (item) {
    return item[prop];
  };
};


/**
 * Quick litle buddy that pads and throws some warnings when something goes :(
 *
 * @param  {array} messages  an array of messages to be displayed
 * @return {undefined}
 */
module.exports.warn = function (messages) {
  if (!messages) {
    throw new Error(
      'Hmm, we had some problems.'
      + '\nMake sure to check out the GitHub page for help:'
      + '\n'
      + '\n    https://github.com/stephenplusplus/wiredep'
    );
  }

  // to prevent duplicate messages, we'll store what we've already presented.
  var displayedMessages = {};
  messages.forEach(function (message, index) {
    if (!displayedMessages[message]) {
      displayedMessages[message] = true;
      if (index % 2 === 0) {
        console.log('\n' + chalk.bgMagenta(message));
      } else {
        console.log(message);
      }
    }
  });
};
