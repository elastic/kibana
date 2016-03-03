/*
Generates file transfer progress messages
*/
export default function Progress(logger) {
  const self = this;

  self.dotCount = 0;
  self.runningTotal = 0;
  self.totalSize = 0;
  self.logger = logger;
}

Progress.prototype.init = function (size) {
  const self = this;

  self.totalSize = size;
  const totalDesc = self.totalSize || 'unknown number of';

  self.logger.log(`Transferring ${totalDesc} bytes`, true);
};

Progress.prototype.progress = function (size) {
  const self = this;

  if (!self.totalSize) return;

  self.runningTotal += size;
  let newDotCount = Math.round(self.runningTotal / self.totalSize * 100 / 5);
  if (newDotCount > 20) newDotCount = 20;
  for (let i = 0; i < (newDotCount - self.dotCount); i++) {
    self.logger.log('.', true);
  }
  self.dotCount = newDotCount;
};

Progress.prototype.complete = function () {
  const self = this;
  self.logger.log(`Transfer complete`, false);
};
