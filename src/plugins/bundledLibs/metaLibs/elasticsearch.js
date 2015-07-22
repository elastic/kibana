require('angular');
module.exports = require('bower_components/elasticsearch/elasticsearch.angular.min');
require('ui/modules').get('kibana', ['elasticsearch']);
