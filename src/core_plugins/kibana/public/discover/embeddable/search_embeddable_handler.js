import searchTemplate from './search_template.html';
import angular from 'angular';
import * as columnActions from 'ui/doc_table/actions/columns';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { EmbeddableHandler } from 'ui/embeddable';


export class SearchEmbeddableHandler extends EmbeddableHandler {

  constructor($compile, $rootScope, searchLoader, Promise) {
    super();
    this.$compile = $compile;
    this.searchLoader = searchLoader;
    this.$rootScope = $rootScope;
    this.name = 'search';
    this.Promise = Promise;
  }

  getEditPath(panelId) {
    return this.Promise.resolve(this.searchLoader.urlFor(panelId));
  }

  getTitleFor(panelId) {
    return this.searchLoader.get(panelId).then(savedObject => savedObject.title);
  }

  render(domNode, panel, container) {
    const searchScope = this.$rootScope.$new();
    return this.getEditPath(panel.id)
      .then(editPath => {
        searchScope.editPath = editPath;
        return this.searchLoader.get(panel.id);
      })
      .then(savedObject => {
        searchScope.savedObj = savedObject;
        searchScope.panel = panel;
        container.registerPanelIndexPattern(panel.panelIndex, savedObject.searchSource.get('index'));

        // This causes changes to a saved search to be hidden, but also allows
        // the user to locally modify and save changes to a saved search only in a dashboard.
        // See https://github.com/elastic/kibana/issues/9523 for more details.
        searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, {
          columns: searchScope.panel.columns || searchScope.savedObj.columns,
          sort: searchScope.panel.sort || searchScope.savedObj.sort
        });

        const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
        searchScope.uiState = container.createChildUistate(getPersistedStateId(panel), uiState);

        searchScope.setSortOrder = function setSortOrder(columnName, direction) {
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { sort: [columnName, direction] });
        };

        searchScope.addColumn = function addColumn(columnName) {
          savedObject.searchSource.get('index').popularizeField(columnName, 1);
          columnActions.addColumn(searchScope.panel.columns, columnName);
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { columns: searchScope.panel.columns });
        };

        searchScope.removeColumn = function removeColumn(columnName) {
          savedObject.searchSource.get('index').popularizeField(columnName, 1);
          columnActions.removeColumn(searchScope.panel.columns, columnName);
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { columns: searchScope.panel.columns });
        };

        searchScope.moveColumn = function moveColumn(columnName, newIndex) {
          columnActions.moveColumn(searchScope.panel.columns, columnName, newIndex);
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { columns: searchScope.panel.columns });
        };

        searchScope.filter = function (field, value, operator) {
          const index = savedObject.searchSource.get('index').id;
          container.addFilter(field, value, operator, index);
        };

        const searchInstance = this.$compile(searchTemplate)(searchScope);
        const rootNode = angular.element(domNode);
        rootNode.append(searchInstance);
      });
  }
}
