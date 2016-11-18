import _ from 'lodash';

import uiModules from 'ui/modules';
import contextAppTemplate from './app.html';
import {fetchAnchor} from './api/anchor';
import {fetchContext} from './api/context';


const module = uiModules.get('apps/context', [
  'kibana',
  'ngRoute',
]);

module.directive('contextApp', function ContextApp() {
  return {
    bindToController: true,
    controller: ContextAppController,
    controllerAs: 'contextApp',
    restrict: 'E',
    scope: {
      anchorUid: '=',
      columns: '=',
      indexPattern: '=',
      size: '=',
      sort: '=',
    },
    template: contextAppTemplate,
  };
});

function ContextAppController($q, es) {
  this.anchorRow = null;
  this.rows = [];

  this.initialize = () => {
    this.actions.reload();
  };

  this.actions = {
    fetchAnchorRow: () => (
      $q.resolve()
        .then(() => (
          fetchAnchor(es, this.indexPattern, this.anchorUid, _.zipObject([this.sort]))
        ))
        .then(anchorRow => (
          this.anchorRow = anchorRow
        ))
    ),
    fetchContextRows: () => (
      $q.resolve(this.anchorRowPromise)
        .then(anchorRow => (
          fetchContext(es, this.indexPattern, anchorRow, _.zipObject([this.sort]), this.size)
        ))
        .then(({predecessors, successors}) => {
          this.predecessorRows = predecessors;
          this.successorRows = successors;
        })
        .then(() => (
          this.rows = [].concat(this.predecessorRows, [this.anchorRow], this.successorRows)
        ))
    ),
    reload: () => {
      this.anchorRowPromise = this.actions.fetchAnchorRow();
      this.contextRowsPromise = this.actions.fetchContextRows();

      $q.all([
        this.anchorRowPromise,
        this.contextRowsPromise,
      ]);
    },
  };

  this.initialize();
}
