var ZeroClipboard = require('./zero_clipboard.js');

ZeroClipboard.config({
  swfPath: require('file!./zero_clipboard.swf'),
  debug: false
});

module.exports = ZeroClipboard;
