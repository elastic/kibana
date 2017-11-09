require('angular');
const elasticsearch = require('../../../node_modules/elasticsearch-browser/elasticsearch.angular.js');
const { uiModules } = require('ui/modules');

uiModules.get('kibana', ['elasticsearch']);

module.exports = elasticsearch;
