require('angular');

// ng-clip expects ZeroClipboard to be global, but it's UMD, so it never is
window.ZeroClipboard = require('bower_components/zeroclipboard/dist/ZeroClipboard.js');
window.ZeroClipboard.SWF_URL = require('file!bower_components/zeroclipboard/dist/ZeroClipboard.swf');

require('bower_components/ng-clip/src/ngClip');
require('ui/modules').get('kibana', ['ngClipboard']);

module.exports = window.ZeroClipboard;
