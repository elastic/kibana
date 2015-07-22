require('brace');
require('brace/mode/json');
require('bower_components/angular-ui-ace/ui-ace');

require('ui/modules').get('kibana', ['ui.ace']);

module.exports = window.ace;
