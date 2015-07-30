var _ = require('lodash');

var opts = [
  /@((?:[!#$&-;=?-\[\]_a-z~]|%[0-9a-f]{2})+\.js)\:(\d+)(?:\:(\d+)|())/ig,
  /(?: \(|at )((?:[!#$&-;=?-\[\]_a-z~]|%[0-9a-f]{2})+\.js)\:(\d+)(?:\:(\d+)|())/ig
];

var sample;
try { throw new Error('msg'); } catch (e) { sample = e.stack; }

var format = _.find(opts, function (format) {
  return format.test(sample);
});

if (!format && window.console && window.console.log) {
  window.console.log('unable to pick format with stack trace sample ' + sample);
}

module.exports = format;
