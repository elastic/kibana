/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidGitUrl } from './git_url_utils';

test('Git url validation', () => {
  // An url ends with .git
  const url1 = 'https://github.com/elastic/elasticsearch.git';
  expect(isValidGitUrl(url1)).toBeTruthy();

  // An url ends without .git
  const url2 = 'https://github.com/elastic/elasticsearch';
  expect(isValidGitUrl(url2)).toBeTruthy();

  // An url with http://
  const url3 = 'http://github.com/elastic/elasticsearch';
  expect(isValidGitUrl(url3)).toBeTruthy();

  // An url with ssh://
  const url4 = 'ssh://elastic@github.com/elastic/elasticsearch.git';
  expect(isValidGitUrl(url4)).toBeTruthy();

  // An url with git://
  const url5 = 'git://elastic@github.com/elastic/elasticsearch.git';
  expect(isValidGitUrl(url5)).toBeTruthy();

  // An url with an invalid protocol
  const url6 = 'file:///Users/elastic/elasticsearch';
  expect(isValidGitUrl(url6)).toBeFalsy();

  // An url without protocol
  const url7 = '/Users/elastic/elasticsearch';
  expect(isValidGitUrl(url7)).toBeFalsy();
});
