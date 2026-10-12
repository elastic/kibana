/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const babelEslint = require('@babel/eslint-parser');

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

const parsedLicenses = new Map();

/** Parses a license option once per process; rules run it for every linted file. */
exports.parseLicense = function parseLicense(license) {
  let parsed = parsedLicenses.get(license);
  if (!parsed) {
    const { body, comments } = babelEslint.parse(license, { requireConfigFile: false });
    parsed = {
      hasBody: body.length > 0,
      commentCount: comments.length,
      nodeValue: comments.length ? exports.normalizeWhitespace(comments[0].value) : undefined,
    };
    parsedLicenses.set(license, parsed);
  }
  return parsed;
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
