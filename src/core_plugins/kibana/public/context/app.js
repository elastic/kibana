import _ from 'lodash';

import 'ui/local_navigation/index';
import uiModules from 'ui/modules';
import contextAppTemplate from './app.html';
import {fetchAnchor} from './api/anchor';
import {fetchContext} from './api/context';


const module = uiModules.get('apps/context', [
  'kibana',
  'ngRoute',
]);
const MIN_CONTEXT_SIZE = 0;

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

function ContextAppController($q, config, es) {
  const defaultSizeStep = parseInt(config.get('context:step'), 10);

  this.anchorRow = null;
  this.rows = [];
  this.initialized = false;

  this.initialize = () => (
    this.actions.reload()
      .then(() => this.initialized = true)
  );

  this.actions = {
    fetchAnchorRow: () => (
      $q.resolve()
        .then(() => (
          fetchAnchor(es, this.indexPattern, this.anchorUid, _.zipObject([this.sort]))
        ))
        .then(anchorRow => this.anchorRow = anchorRow)
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
    increaseSize: (value = defaultSizeStep) => this.actions.setSize(this.size + value),
    decreaseSize: (value = defaultSizeStep) => this.actions.setSize(this.size - value),
    reload: () => {
      this.anchorRowPromise = this.actions.fetchAnchorRow();
      this.contextRowsPromise = this.actions.fetchContextRows();

      return $q.all([
        this.anchorRowPromise,
        this.contextRowsPromise,
      ]);
    },
    setSize: (size) => {
      this.size = Math.max(size, MIN_CONTEXT_SIZE);
      return this.actions.fetchContextRows();
    },
  };

  this.initialize();
}
