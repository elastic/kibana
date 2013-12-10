define([
  'angular',
  'underscore'
  ],
  function(ng, _) {
    'use strict';

    ng.module('kibana.services').service('rowService', function($timeout, dashboard) {
      this.show = function(row, scope) {
        if (row.collapse) {
          this.toggle(row, scope);
          return true;
        }

        return false;
      };

      this.hide = function(row, scope) {
        if (!row.collapse) {
          this.toggle(row, scope);
          return true;
        }

        return false;
      };

      this.toggle = function(row, scope) {
        if(!row.collapsable) {
          return;
        }

        row.collapse = row.collapse ? false : true;

        if (!row.collapse) {
          $timeout(function() {
            scope.$broadcast('render');
          });
        } else {
          row.notice = false;
        }
      };

      this.generateId = function() {
        var existing = [];

        _.forEach(dashboard.current.rows, function(row) {
          if (row.id != null) {
            existing.push(row.id);
          }
        });

        if (existing.length == 0) {
          return 0;
        }

        return Math.max.apply(null, existing) + 1;
      };

      this.idPrefix = function() {
        return 'row-controller-';
      };
    });
  }
);