define([
  'angular',
  'lodash',
  'config',
  'moment'
],
function (angular, _, config, moment) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('kbnIndex', function($http, alertSrv, ejsResource) {
    // returns a promise containing an array of all indices matching the index
    // pattern that exist in a given range
    this.indices = function(from,to,pattern,interval) {
      var possible = [];
      _.each(expand_range(from,to,interval),function(d){
        possible.push(d.utc().format(pattern));
      });

      return resolve_indices(possible).then(function(p) {
        // an extra intersection
        var indices = _.uniq(_.flatten(_.map(possible,function(possibleIndex) {
          return _.intersection(possibleIndex.split(','),p);
        })));
        indices.reverse();
        return indices;
      });
    };

    var ejs = ejsResource(config.elasticsearch);


    // returns a promise containing an array of all indices in an elasticsearch
    // cluster
    function resolve_indices(indices) {
      var something;
      indices = _.uniq(_.map(indices,  encodeURIComponent));

      something = ejs.client.get("/" + indices.join(",") + "/_aliases?ignore_missing=true",
        undefined, undefined, function (data, p) {
          if (p === 404) {
            return [];
          }
          else if(p === 0) {
            alertSrv.set('Error',"Could not contact Elasticsearch at "+ejs.config.server+
              ". Please ensure that Elasticsearch is reachable from your system." ,'error');
          } else {
            alertSrv.set('Error',"Could not reach "+ejs.config.server+"/_aliases. If you"+
              " are using a proxy, ensure it is configured correctly",'error');
          }
          return [];
        });

      return something.then(function(p) {

        var indices = [];
        _.each(p, function(v,k) {
          indices.push(k);
          // Also add the aliases. Could be expensive on systems with a lot of them
          _.each(v.aliases, function(v, k) {
            indices.push(k);
          });
        });
        return indices;
      });
    }

    /*
    // this is stupid, but there is otherwise no good way to ensure that when
    // I extract the date from an object that I get the UTC date. Stupid js.
    // I die a little inside every time I call this function.
    // Update: I just read this again. I died a little more inside.
    // Update2: More death.
    function fake_utc(date) {
      date = moment(date).clone().toDate();
      return moment(new Date(date.getTime() + date.getTimezoneOffset() * 60000));
    }
    */

    // Create an array of date objects by a given interval
    function expand_range(start, end, interval) {
      if(_.contains(['hour','day','week','month','year'],interval)) {
        var range;
        start = moment(start).clone();
        range = [];
        while (start.isBefore(end)) {
          range.push(start.clone());
          switch (interval) {
          case 'hour':
            start.add('hours',1);
            break;
          case 'day':
            start.add('days',1);
            break;
          case 'week':
            start.add('weeks',1);
            break;
          case 'month':
            start.add('months',1);
            break;
          case 'year':
            start.add('years',1);
            break;
          }
        }
        range.push(moment(end).clone());
        return range;
      } else {
        return false;
      }
    }
  });

});
