var ProgressBar = require('progress');

module.exports = function (argv) {
  var start;
  var fallbackUpdateTimeout;
  var progressBar;

  argv.startedIndexing = function () {
    start = Date.now()
  };

  argv.pausing = function () {

  };

  if (argv.verbose) {
    argv.progress = _.bind(console.log, console, 'bulk request indexed %s documents \n');
  } else {
    argv.progress = function update(indexedCount) {
      if (!progressBar) {
        progressBar = new ProgressBar('indexing [:bar] :percent :etas ', {
          total: argv.total,
          incomplete: ' ',
          width: 80
        });

        progressBar.destroy = function() {
          progressBar.terminate();
          fallbackUpdateTimeout = clearTimeout(fallbackUpdateTimeout);
        }
      }

      progressBar.tick(indexedCount || 0);
      fallbackUpdateTimeout = clearTimeout(fallbackUpdateTimeout);
      fallbackUpdateTimeout = setTimeout(update, 1000);
    };
  }

  argv.doneIndexing = function () {
    var end = Date.now();
    var time = Math.round((end - start) / 1000);
    console.log('\ncreated ' + argv.total + ' events in ' + time + ' seconds.');
    if (progressBar) progressBar.destroy();
  };
};
