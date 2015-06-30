module.exports = function (silent) {
  var previousLineEnded = true;
  silent = !!silent;

  function log(data, sameLine) {
    if (silent) return;

    if (!sameLine && !previousLineEnded) {
      process.stdout.write('\n');
    }

    //if data is a stream, pipe it.
    if (data.readable) {
      data.pipe(process.stdout);
      return;
    }

    if (!sameLine) data += '\n';
    process.stdout.write(data);
    previousLineEnded = !sameLine;
  }

  function error(data) {
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