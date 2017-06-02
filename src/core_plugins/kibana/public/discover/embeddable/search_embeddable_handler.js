import searchTemplate from './search_template.html';
import angular from 'angular';
import * as columnActions from 'ui/doc_table/actions/columns';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { FilterManagerProvider } from 'ui/filter_manager';

export class SearchEmbeddableHandler {
  constructor($compile, $rootScope, searchLoader, Private) {
    this.$compile = $compile;
    this.searchLoader = searchLoader;
    this.filterManager = Private(FilterManagerProvider);
    this.$rootScope = $rootScope;
    this.name = 'search';
    this.title = 'Saved Searches';
  }

  getEditPath(panel) {
    return this.searchLoader.urlFor(panel.id);
  }

  canRenderType(type) {
    return type === 'search';
  }

  getTitleFor(panel) {
    return this.searchLoader.get(panel.id).then(savedObject => savedObject.title);
  }

  renderAt(domNode, panel, actions) {
    return this.searchLoader.get(panel.id).then((savedObject) => {
      const editUrl = this.searchLoader.urlFor(panel.id);
      const searchScope = this.$rootScope.$new();
      searchScope.editUrl = editUrl;
      searchScope.savedObj = savedObject;
      searchScope.panel = panel;

      // This causes changes to a saved search to be hidden, but also allows
      // the user to locally modify and save changes to a saved search only in a dashboard.
      // See https://github.com/elastic/kibana/issues/9523 for more details.
      actions.saveState({
        columns: searchScope.panel.columns || searchScope.savedObj.columns,
        sort: searchScope.panel.sort || searchScope.savedObj.sort
      });

      const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
      searchScope.uiState = actions.createChildUiState(getPersistedStateId(panel), uiState);

      searchScope.setSortOrder = function setSortOrder(columnName, direction) {
        actions.saveState({ sort: [columnName, direction] });
      };

      searchScope.addColumn = function addColumn(columnName) {
        savedObject.searchSource.get('index').popularizeField(columnName, 1);
        columnActions.addColumn(searchScope.panel.columns, columnName);
        actions.saveState({});  // sync to sharing url
      };

      searchScope.removeColumn = function removeColumn(columnName) {
        savedObject.searchSource.get('index').popularizeField(columnName, 1);
        columnActions.removeColumn(searchScope.panel.columns, columnName);
        actions.saveState({});  // sync to sharing url
      };

      searchScope.moveColumn = function moveColumn(columnName, newIndex) {
        columnActions.moveColumn(searchScope.panel.columns, columnName, newIndex);
        actions.saveState({});  // sync to sharing url
      };

      searchScope.filter = function (field, value, operator) {
        const index = savedObject.searchSource.get('index').id;
        this.filterManager.add(field, value, operator, index);
      };

      const searchInstance = this.$compile(searchTemplate)(searchScope);
      const rootNode = angular.element(domNode);
      rootNode.append(searchInstance);
    });
  }
}
