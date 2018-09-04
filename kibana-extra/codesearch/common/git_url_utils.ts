/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function isValidGitUrl(url: string): boolean {
  // Inspired by https://github.com/jonschlinkert/is-git-url/blob/master/index.js#L9 with minor
  // modification to support urls end without '.git'.
  const regex = /(?:git|ssh|https?|git@[-\w.]+):(\/\/)?(.*?)(\.git)?(\/?|\#[-\d\w._]+?)$/;
  return regex.test(url);
}
