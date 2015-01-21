var path = require('path');
var pkgPath = path.resolve(__dirname, '..', '..', '..', 'package.json');
var pkg = require(pkgPath);

module.exports = function () {
  return function (req, res, next) {
    console.log('middleware');
    res.header('X-App-Name', 'kibana');
    res.header('X-App-Version', pkg.version);
    next();
  };
};
