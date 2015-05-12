var fs = require('fs');
module.exports = function checkPath(path) {
  try {
    fs.statSync(path);
    return true;
  } catch (err) {
    return false;
  }
};

