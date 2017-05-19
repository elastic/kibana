import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import MapsVisTypeMapsRenderbotProvider from './maps_renderbot';
import $ from 'jquery';

export function MapsVisualizationProvider(Private) {

  const MapsRenderbot = Private(MapsVisTypeMapsRenderbotProvider);

  class MapsVisController {
    constructor(el) {
      this.el = $(el);
    }

    render(vis, esResponse) {
      return new Promise(resolve => {
        if (!this.renderbot) {
          this.renderbot = new MapsRenderbot(vis, this.el, vis.getUiState());
        }
        this.renderbot.render(esResponse);
        resolve();
      });
    }

    destroy() {
      this.renderbot.destroy();
    }
  }

  return MapsVisController;
}

