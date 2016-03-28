"use strict";

/*!
 * knox
 * Copyright(c) 2010–2012 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Client is the main export.
 */

exports = module.exports = require('./client');

/**
 * Expose utilities.
 *
 * @type Object
 */

exports.utils = require('./utils');

/**
 * Expose auth utils.
 *
 * @type Object
 */

exports.auth = require('./auth');
