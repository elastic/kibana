import searchTemplate from './search_template.html';
import angular from 'angular';
import 'ui/doc_table';

import * as columnActions from 'ui/doc_table/actions/columns';
import { PersistedState } from 'ui/persisted_state';
import { EmbeddableFactory, Embeddable } from 'ui/embeddable';

export class SearchEmbeddableFactory extends EmbeddableFactory {

  constructor($compile, $rootScope, searchLoader, Promise, courier) {
    super();
    this.$compile = $compile;
    this.searchLoader = searchLoader;
    this.$rootScope = $rootScope;
    this.name = 'search';
    this.Promise = Promise;
    this.courier = courier;
  }

  getEditPath(panelId) {
    return this.searchLoader.urlFor(panelId);
  }

  getTitleFor(panelId) {
    return this.searchLoader.get(panelId).then(savedObject => savedObject.title);
  }

  render(domNode, panel, container) {
    const searchScope = this.$rootScope.$new();
    searchScope.editPath = this.getEditPath(panel.id);
    return this.searchLoader.get(panel.id)
      .then(savedObject => {
        if (!container.getHidePanelTitles()) {
          searchScope.sharedItemTitle = panel.title !== undefined ? panel.title : savedObject.title;
        }
        searchScope.savedObj = savedObject;
        searchScope.panel = panel;
        container.registerPanelIndexPattern(panel.panelIndex, savedObject.searchSource.get('index'));

        // If there is column or sort data on the panel, that means the original columns or sort settings have
        // been overridden in a dashboard.
        searchScope.columns = searchScope.panel.columns || searchScope.savedObj.columns;
        searchScope.sort = searchScope.panel.sort || searchScope.savedObj.sort;

        const parsedUiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
        searchScope.uiState = new PersistedState({
          ...parsedUiState,
          ...panel.embeddableConfig,
        });
        const uiStateChangeHandler = () => {
          searchScope.panel = container.updatePanel(
            searchScope.panel.panelIndex,
            { embeddableConfig: searchScope.uiState.toJSON() }
          );
        };
        searchScope.uiState.on('change', uiStateChangeHandler);

        searchScope.setSortOrder = function setSortOrder(columnName, direction) {
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { sort: [columnName, direction] });
          searchScope.sort = searchScope.panel.sort;
        };

        searchScope.addColumn = function addColumn(columnName) {
          savedObject.searchSource.get('index').popularizeField(columnName, 1);
          columnActions.addColumn(searchScope.columns, columnName);
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { columns: searchScope.columns });
        };

        searchScope.removeColumn = function removeColumn(columnName) {
          savedObject.searchSource.get('index').popularizeField(columnName, 1);
          columnActions.removeColumn(searchScope.columns, columnName);
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { columns: searchScope.columns });
        };

        searchScope.moveColumn = function moveColumn(columnName, newIndex) {
          columnActions.moveColumn(searchScope.columns, columnName, newIndex);
          searchScope.panel = container.updatePanel(searchScope.panel.panelIndex, { columns: searchScope.columns });
        };

        searchScope.filter = function (field, value, operator) {
          const index = savedObject.searchSource.get('index').id;
          container.addFilter(field, value, operator, index);
        };

        const searchInstance = this.$compile(searchTemplate)(searchScope);
        const rootNode = angular.element(domNode);
        rootNode.append(searchInstance);

        this.addDestroyEmeddable(panel.panelIndex, () => {
          searchScope.uiState.off('change', uiStateChangeHandler);
          searchInstance.remove();
          searchScope.savedObj.destroy();
          searchScope.$destroy();
        });

        return new Embeddable({
          title: savedObject.title,
          editUrl: searchScope.editPath
        });
      });
  }
}
