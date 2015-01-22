var Istanbul = require('istanbul');
var i = new Istanbul.Instrumenter({
  embedSource: true,
  preserveComments: true,
  noAutoWrap: true
});

module.exports = function instrumentationMiddleware(opts) {
  var fs = require('fs');
  var path = require('path');

  // for root directory that files will be served from
  var root = opts.root || '/';

  // the root directory used to create a relative file path
  // for display in coverage reports
  var displayRoot = opts.displayRoot || null;

  // filter the files in root that can be instrumented
  var filter = opts.filter || function (filename) {
    // by default only instrument *.js files
    return /\.js$/.test(filename);
  };

  // cache filename resolution
  var fileMap = {};

  function filenameForReq(req) {
    if (!req._parsedUrl.query || !~req._parsedUrl.query.indexOf('instrument')) return false;

    // expected absolute path to the file
    var filename = path.join(root, req._parsedUrl.pathname);

    // shortcut for dev where we could be reloading on every save
    if (fileMap[filename] !== void 0) return fileMap[filename];

    var ret = filename;

    if (!fs.existsSync(filename) || !opts.filter(filename)) {
      ret = false;
    }

    // cache the return value for next time
    fileMap[filename] = ret;
    return ret;
  }

  return function (req, res, next) {
    // resolve the request to a readable filename
    var filename = filenameForReq(req);
    // the file either doesn't exist of it was filtered out by opts.filter
    if (!filename) return next();

    fs.stat(filename, function (err, stat) {
      if (err && err.code !== 'ENOENT') return next(err);

      if (err || !stat.isFile()) {
        // file was deleted, clear cache and move on
        delete fileMap[filename];
        return next();
      }

      var etag = '"' + stat.size + '-' + Number(stat.mtime) + '"';
      if (req.headers['if-none-match'] === etag) {
        res.statusCode = 304;
        res.end();
        return;
      }

      fs.readFile(filename, 'utf8', function (err, content) {
        if (err) return next(err);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('ETag', etag);
        res.end(i.instrumentSync(
          content,
          // make file names easier to read
          displayRoot ? path.relative(displayRoot, filename) : filename
        ));
      });
    });
  };


};