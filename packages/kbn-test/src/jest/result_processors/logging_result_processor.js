/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const FAILURE_MESSAGE_TRIGGERS = ['but is not defined anymore'];
const log = (...args) => {
  const loggable = args.map((arg) =>
    typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
  );
  process.stdout.write(`${loggable.join(' ')}\n`, 'utf8');
};
/**
 * This processor looks for specific errors, and logs the result context of test suites where they occur.
 * @param results
 * @returns {*}
 */
module.exports = (results) => {
  const resultsThatMatchTriggers = results.testResults.filter(
    (e) =>
      e.failureMessage &&
      FAILURE_MESSAGE_TRIGGERS.some((trigger) => e.failureMessage.includes(trigger))
  );

  if (resultsThatMatchTriggers.length !== 0) {
    log('The following test suites failed, with notable errors:');
    resultsThatMatchTriggers.forEach((e) => {
      log(` -> ${e.testFilePath}`, 'Details: ', e, '\n');
    });
  }

  return results;
};
