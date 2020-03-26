const brokenRequire = require('does-not-exist'); // eslint-disable-line

module.exports = function(kibana) {
  return new kibana.Plugin({
    id: 'foo',
  });
};
