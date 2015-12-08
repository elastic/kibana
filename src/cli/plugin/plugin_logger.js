module.exports = function (settings) {
  var previousLineEnded = true;
  var silent = !!settings.silent;
  var quiet = !!settings.quiet;

  function log(data, sameLine) {
    if (silent || quiet) return;

    if (!sameLine && !previousLineEnded) {
      process.stdout.write('\n');
    }

    //if data is a stream, pipe it.
    if (data.readable) {
      data.pipe(process.stdout);
      return;
    }

    process.stdout.write(data);
    if (!sameLine) process.stdout.write('\n');
    previousLineEnded = !sameLine;
  }

  function error(data) {
    if (silent) return;

    if (!previousLineEnded) {
      process.stderr.write('\n');
    }

    //if data is a stream, pipe it.
    if (data.readable) {
      data.pipe(process.stderr);
      return;
    }
    process.stderr.write(data + '\n');
    previousLineEnded = true;
  }

  return {
    log: log,
    error: error
  };
};
