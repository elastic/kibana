require('bower_components/ace-builds/src-noconflict/ace');
require('bower_components/ace-builds/src-noconflict/mode-json');
require('bower_components/angular-ui-ace/ui-ace');

require('ui/modules').get('kibana', ['ui.ace']);

module.exports = window.ace;
