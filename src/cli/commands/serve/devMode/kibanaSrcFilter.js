'use strict';

module.exports = function (filename) {
  let isJs = filename.match(/\.js$/);
  let inSrc = filename.match(/\/src\//);
  let isRison = filename.match(/rison\.js$/);
  return isJs && inSrc && !isRison;
};
