/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

exports.assert = function assert(truth, message) {
  if (truth) {
    return;
  }

  const error = new Error(message);
  error.failedAssertion = true;
  throw error;
};

exports.normalizeWhitespace = function normalizeWhitespace(string) {
  return string.replace(/\s+/g, ' ');
};

exports.init = function (context, program, initStep) {
  try {
    return initStep();
  } catch (error) {
    if (error.failedAssertion) {
      context.report({
        node: program,
        message: error.message,
      });
    } else {
      throw error;
    }
  }
};
