import 'ui/doc_table';

import { EmbeddableFactory } from 'ui/embeddable';
import { SearchEmbeddable } from './search_embeddable';

export class SearchEmbeddableFactory extends EmbeddableFactory {
  constructor($compile, $rootScope, searchLoader) {
    super();
    this.$compile = $compile;
    this.searchLoader = searchLoader;
    this.$rootScope = $rootScope;
    this.name = 'search';
  }

  getEditPath(panelId) {
    return this.searchLoader.urlFor(panelId);
  }

  /**
   *
   * @param {Object} panelMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param onEmbeddableStateChanged
   * @return {Promise.<Embeddable>}
   */
  create(panelMetadata, onEmbeddableStateChanged) {
    const searchId = panelMetadata.id;
    const editUrl = this.getEditPath(searchId);

    return this.searchLoader.get(searchId)
      .then(savedObject => {
        return new SearchEmbeddable({
          onEmbeddableStateChanged,
          savedSearch: savedObject,
          editUrl,
          loader: this.searchLoader,
          $rootScope: this.$rootScope,
          $compile: this.$compile,
        });
      });
  }
}
