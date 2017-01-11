var map = require('through2-map').obj;
var gitInfo = require('./git_info');

module.exports = function rewritePackage(buildSource, buildVersion, kibanaVersion) {
  return map(function (file) {
    if (file.basename === 'package.json' && file.dirname === buildSource) {
      var pkg = JSON.parse(file.contents.toString('utf8'));

      // rewrite the target kibana version while the
      // file is on it's way to the archive
      if (!pkg.kibana) pkg.kibana = {};
      pkg.kibana.version = kibanaVersion;
      pkg.version = buildVersion;

      // append build info
      pkg.build = {
        git: gitInfo(buildSource),
        date: new Date().toString()
      };

      // remove development properties from the package file
      delete pkg.scripts;
      delete pkg.devDependencies;

      file.contents = toBuffer(JSON.stringify(pkg, null, 2));
    }

    return file;
  });
};

function toBuffer(string) {
  if (typeof Buffer.from === 'function') {
    return Buffer.from(string, 'utf8');
  } else {
    // this was deprecated in node v5 in favor
    // of Buffer.from(string, encoding)
    return new Buffer(string, 'utf8');
  }
}