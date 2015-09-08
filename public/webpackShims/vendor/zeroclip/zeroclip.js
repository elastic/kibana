var ZeroClipboard = require('./zero_clipboard.js');

ZeroClipboard.setDefaults({
  moviePath: require('file!./zero_clipboard.swf'),
  debug: false
});

module.exports = ZeroClipboard;
