/*
Generates file transfer progress messages
*/
export default function createProgressReporter(logger) {
  let dotCount = 0;
  let runningTotal = 0;
  let totalSize = 0;

  function init(size) {
    totalSize = size;
    let totalDesc = totalSize || 'unknown number of';

    logger.log(`Transferring ${totalDesc} bytes`, true);
  }

  //Should log a dot for every 5% of progress
  function progress(size) {
    if (!totalSize) return;

    runningTotal += size;
    let newDotCount = Math.round(runningTotal / totalSize * 100 / 5);
    if (newDotCount > 20) newDotCount = 20;
    for (let i = 0; i < (newDotCount - dotCount); i++) {
      logger.log('.', true);
    }
    dotCount = newDotCount;
  }

  function complete() {
    logger.log(`Transfer complete`, false);
  }

  return {
    init: init,
    progress: progress,
    complete: complete
  };
};
