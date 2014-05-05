define([
  'angular',
  'lodash',
  'config'
],
function (angular, _, config) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('esVersion', function($http, alertSrv, esMinVersion, $q, ejsResource) {

    this.versions = [];

    var ejs = ejsResource(config.elasticsearch);


    // save a reference to this
    var self = this,
      defer = $q.defer();

    this.init = function() {
      getVersions();
    };

    var getVersions = function() {
      if(self.versions.length !== 0) {
        defer.resolve(self.versions);
        return defer.promise;
      } else {
        var nodeInfo = ejs.client.get('/_nodes',
          undefined, undefined, function(data, status) {
          if(status === 0) {
            alertSrv.set('Error',"Could not contact Elasticsearch at "+ejs.client.server()+
              ". Please ensure that Elasticsearch is reachable from your system." ,'error');
          } else {
            alertSrv.set('Error',"Could not reach "+ejs.client.server()+"/_nodes. If you"+
            " are using a proxy, ensure it is configured correctly",'error');
          }
          return;
        });

        return nodeInfo.then(function(p) {
          _.each(p.nodes, function(v) {
            self.versions.push(v.version.split('-')[0]);
          });
          self.versions = sortVersions(_.uniq(self.versions));
          return self.versions;
        });
      }

    };

    // Get the max version in this cluster
    this.max = function(versions) {
      return _.last(versions);
    };

    // Return the lowest version in the cluster
    this.min = function(versions) {
      return _.first(versions);
    };

    // Sort versions from lowest to highest
    var sortVersions = function(versions) {
      var _versions = _.clone(versions),
        _r = [];

      while(_r.length < versions.length) {
        var _h = "0";
        /*jshint -W083 */
        _.each(_versions,function(v){
          if(self.compare(_h,v)) {
            _h = v;
          }
        });
        _versions = _.without(_versions,_h);
        _r.push(_h);
      }
      return _r.reverse();
    };

    /*
      Takes a version string with one of the following optional comparison prefixes: >,>=,<.<=
      and evaluates if the cluster meets the requirement. If the prefix is omitted exact match
      is assumed
    */
    this.is = function(equation) {
      var _v = equation,
        _cf;

      if(_v.charAt(0) === '>') {
        _cf = _v.charAt(1) === '=' ? self.gte(_v.slice(2)) : self.gt(_v.slice(1));
      } else if (_v.charAt(0) === '<') {
        _cf = _v.charAt(1) === '=' ? self.lte(_v.slice(2)) : self.lt(_v.slice(1));
      } else {
        _cf = self.eq(_v);
      }

      return _cf;
    };

    this.isMinimum = function() {
      return self.gte(esMinVersion);
    };

    // check if lowest version in cluster = `version`
    this.eq = function(version) {
      return getVersions().then(function(v) {
        return version === self.min(v) ? true : false;
      });

    };

    // version > lowest version in cluster?
    this.gt = function(version) {
      return getVersions().then(function(v) {
        return version === self.min(v) ? false : self.gte(version);
      });

    };

    // version < highest version in cluster?
    this.lt = function(version) {
      return getVersions().then(function(v) {
        return version === self.max(v) ? false : self.lte(version);
      });

    };

    // Check if the lowest version in the cluster is >= to `version`
    this.gte = function(version) {
      return getVersions().then(function(v) {
        return self.compare(version,self.min(v));
      });

    };

    // Check if the highest version in the cluster is <= to `version`
    this.lte = function(version) {
      return getVersions().then(function(v) {
        return self.compare(self.max(v),version);
      });
    };

    // Determine if a specific version is greater than or equal to another
    this.compare = function (required,installed) {
      if(!required || !installed) {
        return undefined;
      }

      var a = installed.split('.');
      var b = required.split('.');
      var i;

      // leave suffixes as is ("RC1 or -SNAPSHOT")
      for (i = 0; i < Math.min(a.length, 3); ++i) {
        a[i] = Number(a[i]);
      }
      for (i = 0; i < Math.min(b.length, 3); ++i) {
        b[i] = Number(b[i]);
      }
      if (a.length === 2) {
        a[2] = 0;
      }

      if (a[0] > b[0]){return true;}
      if (a[0] < b[0]){return false;}

      if (a[1] > b[1]){return true;}
      if (a[1] < b[1]){return false;}

      if (a[2] > b[2]){return true;}
      if (a[2] < b[2]){return false;}

      if (a.length > 3) {
        // rc/beta suffix
        if (b.length <= 3) {
          return false;
        } // no suffix on b -> a<b
        return a[3] >= b[3];
      }
      if (b.length > 3) {
        // b has a suffix but a not -> a>b
        return true;
      }

      return true;
    };

    this.init();

  });

});