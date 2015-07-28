require('angular');
module.exports = require('node_modules/elasticsearch/elasticsearch.angular.min');
require('ui/modules').get('kibana', ['elasticsearch']);
