export default function Logger(settings) {
  const self = this;

  self.previousLineEnded = true;
  self.silent = !!settings.silent;
  self.quiet = !!settings.quiet;
}

Logger.prototype.log = function (data, sameLine) {
  const self = this;

  if (self.silent || self.quiet) return;

  if (!sameLine && !self.previousLineEnded) {
    process.stdout.write('\n');
  }

  //if data is a stream, pipe it.
  if (data.readable) {
    data.pipe(process.stdout);
    return;
  }

  process.stdout.write(data);
  if (!sameLine) process.stdout.write('\n');
  self.previousLineEnded = !sameLine;
};

Logger.prototype.error = function (data) {
  const self = this;

  if (self.silent) return;

  if (!self.previousLineEnded) {
    process.stderr.write('\n');
  }

  //if data is a stream, pipe it.
  if (data.readable) {
    data.pipe(process.stderr);
    return;
  }
  process.stderr.write(`${data}\n`);
  self.previousLineEnded = true;
};
