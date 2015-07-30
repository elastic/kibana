require('angular');

// ng-clip expects ZeroClipboard to be global, but it's UMD, so it never is
window.ZeroClipboard = require('node_modules/zeroclipboard/dist/ZeroClipboard.js');
window.ZeroClipboard.SWF_URL = require('file!node_modules/zeroclipboard/dist/ZeroClipboard.swf');

require('node_modules/ng-clip/src/ngClip');
require('ui/modules').get('kibana', ['ngClipboard']);

module.exports = window.ZeroClipboard;
