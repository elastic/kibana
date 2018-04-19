import $ from 'jquery';
import { getVisualizeLoader } from 'ui/visualize/loader';
import { EmbeddableFactory, Embeddable } from 'ui/embeddable';
import { VisualizeEmbeddable } from './visualize_embeddable';

import labDisabledTemplate from './visualize_lab_disabled.html';

export class VisualizeEmbeddableFactory extends EmbeddableFactory {
  constructor(savedVisualizations, config) {
    super();
    this._config = config;
    this.savedVisualizations = savedVisualizations;
    this.name = 'visualization';
  }

  getEditPath(panelId) {
    return this.savedVisualizations.urlFor(panelId);
  }

  /**
   *
   * @param {Object} panelMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param {function} onEmbeddableStateChanged
   * @return {Promise.<{ metadata, onContainerStateChanged, render, destroy }>}
   */
  create(panelMetadata, onEmbeddableStateChanged) {
    const visId = panelMetadata.id;
    const editUrl = this.getEditPath(visId);

    const waitFor = [ getVisualizeLoader(), this.savedVisualizations.get(visId) ];
    return Promise.all(waitFor)
      .then(([loader, savedObject]) => {
        const isLabsEnabled = this._config.get('visualize:enableLabs');

        if (!isLabsEnabled && savedObject.vis.type.stage === 'lab') {
          return new Embeddable({
            metadata: {
              title: savedObject.title,
            },
            render: (domNode) => {
              const template = $(labDisabledTemplate);
              template.find('.disabledLabVisualization__title').text(savedObject.title);
              $(domNode).html(template);
            }
          });
        } else {
          return new VisualizeEmbeddable({
            onEmbeddableStateChanged,
            savedVisualization: savedObject,
            editUrl,
            loader,
          });
        }
      });
  }
}
