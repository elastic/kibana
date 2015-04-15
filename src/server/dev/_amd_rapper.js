module.exports = function amdRapMiddleware(opts) {
  opts = opts || {};

  var root = opts.root || '/';
  var path = require('path');
  var fs = require('fs');
  var random = require('lodash').sample;
  var pathPrefix = opts.pathPrefix || '/amd-wrap/';

  var rap = [
    'yo yo yo',
    'check it',
    'yeeaahh!',
    'grocery bag...'
  ];

  return function (req, res, next) {
    // only allow prefixed requests
    if (req.url.substring(0, pathPrefix.length) !== pathPrefix) return next();

    // strip the prefix and form the filename
    var filename = path.join(root, req._parsedUrl.pathname.replace('/amd-wrap/', ''));

    fs.readFile(filename, 'utf8', function (err, contents) {
      // file does not exist
      if (err) return next(err.code === 'ENOENT' ? void 0 : err);

      // respond with the wrapped code
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/javascript');
      res.end([
        'define(function (require, exports, module) { console.log("' + random(rap) + '");',
        contents,
        '\n});'
      ].join('\n'));
    });
  };
};