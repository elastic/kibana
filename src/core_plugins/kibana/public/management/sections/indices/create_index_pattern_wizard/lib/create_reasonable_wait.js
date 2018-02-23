export function createReasonableWait(...promises) {
  return Promise.all([
    ...promises,
    new Promise(resolve => {
      // Make every fetch take a minimal amount of time so the user gets some feedback that something
      // is happening.
      setTimeout(() => {
        resolve();
      }, 500);
    }),
  ]);
}
