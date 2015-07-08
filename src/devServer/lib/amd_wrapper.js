module.exports = function (opts) {

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

  return function (request, reply) {
    // only allow prefixed requests
    if (request.path.substring(0, pathPrefix.length) !== pathPrefix) return reply.continue();

    // strip the prefix and form the filename
    var filename = path.join(root, request.path.replace('/amd-wrap/', ''));

    fs.readFile(filename, 'utf8', function (err, contents) {
      // file does not exist
      if (err) {
        if (err.code === 'ENOENT') {
          return reply.continue();
        }
        return reply(err);
      }

      // respond with the wrapped code
      var source = [
        'define(function (require, exports, module) { console.log("' + random(rap) + '");',
        contents,
        '\n});'
      ].join('\n');

      return reply(source).code(200).type('application/javascript');
    });

  };

};
