/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Given a mocha instance that has already loaded all of its suites, filter out
 * the suites based on the include/exclude tags. If there are include tags then
 * only suites which include the tag will be run, and if there are exclude tags
 * then any suite with that tag will not be run.
 *
 * @param options.mocha instance of mocha that we are going to be running
 * @param options.include an array of tags that suites must be tagged with to be run
 * @param options.exclude an array of tags that will be used to exclude suites from the run
 */
export function filterSuitesByTags({ log, mocha, include, exclude }) {
  mocha.excludedTests = [];
  // collect all the tests from some suite, including it's children
  const collectTests = (suite) =>
    suite.suites.reduce((acc, s) => acc.concat(collectTests(s)), suite.tests);

  // if include tags were provided, filter the tree once to
  // only include branches that are included at some point
  if (include.length) {
    log.info('Only running suites (and their sub-suites) if they include the tag(s):', include);

    const isIncluded = (suite) =>
      !suite._tags ? false : suite._tags.some((t) => include.includes(t));
    const isChildIncluded = (suite) =>
      suite.suites.some((s) => isIncluded(s) || isChildIncluded(s));

    (function recurse(parentSuite) {
      const children = parentSuite.suites;
      parentSuite.suites = [];

      for (const child of children) {
        // this suite is explicitly included
        if (isIncluded(child)) {
          parentSuite.suites.push(child);
          continue;
        }

        // this suite has an included child but is not included
        // itself, so strip out its tests and recurse to filter
        // out child suites which are not included
        if (isChildIncluded(child)) {
          mocha.excludedTests = mocha.excludedTests.concat(child.tests);
          child.tests = [];
          parentSuite.suites.push(child);
          recurse(child);
          continue;
        } else {
          mocha.excludedTests = mocha.excludedTests.concat(collectTests(child));
        }
      }
    })(mocha.suite);
  }

  // if exclude tags were provided, filter the possibly already
  // filtered tree to remove branches that are excluded
  if (exclude.length) {
    log.info('Filtering out any suites that include the tag(s):', exclude);

    const isNotExcluded = (suite) => !suite._tags || !suite._tags.some((t) => exclude.includes(t));

    (function recurse(parentSuite) {
      const children = parentSuite.suites;
      parentSuite.suites = [];

      for (const child of children) {
        // keep suites that are not explicitly excluded but
        // recurse to remove excluded children
        if (isNotExcluded(child)) {
          parentSuite.suites.push(child);
          recurse(child);
        } else {
          mocha.excludedTests = mocha.excludedTests.concat(collectTests(child));
        }
      }
    })(mocha.suite);
  }
}
