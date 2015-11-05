var zlib     = require('zlib');
var through2 = require('through2');
var toArray  = require('stream-to-array');

module.exports = function(contents, options, callback) {
  // Check if the threshold option is set
  if (options.threshold) {
    // Check if the stream contents is less than the threshold
    toArray(contents, function (err, chunks) {
      if (err) {
        callback(err, null, false);
        return;
      }

      // Join chunks array into a single buffer
      var buffer = Buffer.concat(chunks);

      // Create a stream to return to the callback
      var contentStream = through2();
      contentStream.end(buffer);

      // Check if the stream content length is less than the threshold
      if (buffer.length < options.threshold) {
        // File does not meet the minimum size requirement for compression
        callback(null, contentStream, false);
      } else {
        // File meets the minimum size requirement for compression
        var gzipStream = zlib.createGzip(options.gzipOptions);
        callback(null, contentStream.pipe(gzipStream), true);
      }
    });
  } else {
    // Compress the file contents
    var gzipStream = zlib.createGzip(options.gzipOptions);
    callback(null, contents.pipe(gzipStream), true);
  }
};
