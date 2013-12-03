define([
  'angular',
  'underscore',
  'config'
],
function (angular, _, config) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('fields', function(dashboard, $rootScope, $http, alertSrv, ejsResource) {
    // Save a reference to this
    var self = this;

    this.list = ['_type'];
    this.mapping = {};
    this.fullMapping = {};

    $rootScope.$watch(function(){return dashboard.indices;},function(n) {
      if(!_.isUndefined(n) && n.length) {
        // Only get the mapping for indices we don't know it for
        var indices = _.difference(n,_.keys(self.fullMapping));
        // Only get the mapping if there are new indices
        if(indices.length > 0) {
          self.map(indices).then(function(result) {
            self.fullMapping = _.extend(self.fullMapping,result);
            self.list = mapFields(self.fullMapping);
          });
        // Otherwise just use the cached mapping
        } else {
          // This is inefficient, should not need to reprocess?
          self.list = mapFields(_.pick(self.fullMapping,n));
        }
      }
    });

    var ejs = ejsResource(config.elasticsearch);

    var mapFields = function (m) {
      var fields = [];
      _.each(m, function(types) {
        _.each(types, function(v) {
          fields = _.without(_.union(fields,_.keys(v)),'_all','_source');
        });
      });
      return fields;
    };

    this.map = function(indices) {
      var request = ejs.client.get('/' + indices.join(',') + "/_mapping",
        undefined, undefined, function(data, status) {
          if(status === 0) {
            alertSrv.set('Error',"Could not contact Elasticsearch at "+ejs.config.server+
              ". Please ensure that Elasticsearch is reachable from your system." ,'error');
          } else {
            alertSrv.set('Error',"No index found at "+ejs.config.server+"/" +
              indices.join(',')+"/_mapping. Please create at least one index."  +
              "If you're using a proxy ensure it is configured correctly.",'error');
          }
        });

      // Flatten the mapping of each index into dot notated keys.
      return request.then(function(p) {
        var mapping = {};
        _.each(p.data, function(type,index) {
          mapping[index] = {};
          _.each(type, function (fields,typename) {
            mapping[index][typename] = flatten(fields);
          });
        });
        return mapping;
      });
    };

    var flatten = function(obj,prefix) {
      var propName = (prefix) ? prefix :  '',
        dot = (prefix) ? '.':'',
        ret = {};
      for(var attr in obj){
        // For now only support multi field on the top level
        // and if there is a default field set.
        if(obj[attr]['type'] === 'multi_field') {
          ret[attr] = obj[attr]['fields'][attr] || obj[attr];
          continue;
        }
        if (attr === 'properties') {
          _.extend(ret,flatten(obj[attr], propName));
        } else if(typeof obj[attr] === 'object'){
          _.extend(ret,flatten(obj[attr], propName + dot + attr));
        } else {
          ret[propName] = obj;
        }
      }
      return ret;
    };

  });

});
