const { callbackify } = require('util');

module.exports = callbackify(() => {
  return Promise.resolve('mkdirp mock value');
});
