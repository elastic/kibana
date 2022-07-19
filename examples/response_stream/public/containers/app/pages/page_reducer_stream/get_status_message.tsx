/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getStatusMessage(isRunning: boolean, isCancelled: boolean, progress: number) {
  if (!isRunning && !isCancelled && progress === 0) {
    return 'Development did not start yet.';
  } else if (isRunning && !isCancelled) {
    return 'Development is ongoing, the hype is real!';
  } else if (!isRunning && isCancelled) {
    return 'Oh no, development got cancelled!';
  } else if (!isRunning && progress === 100) {
    return 'Development completed, the release got out the door!';
  }

  // When the process stops but wasn't cancelled by the user and progress is not yet at 100%,
  // this indicates there must have been a problem with the stream.
  return 'Oh no, looks like there was a bug?!';
}
