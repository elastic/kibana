import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import MapsVisTypeMapsRenderbotProvider from './maps_renderbot';
import $ from 'jquery';

export function MapsVisualizationProvider(Private) {

  const MapsRenderbot = Private(MapsVisTypeMapsRenderbotProvider);

  class MapsVisController {
    constructor(el, vis) {
      this.el = $(el);
      this._vis = vis;
      this.renderbot = new MapsRenderbot(this._vis, this.el, vis.getUiState());
    }

    async render(esResponse) {
      //todo: should notify of render-completeness, which it isn't doing correctly now
      this.renderbot.render(esResponse);
    }

    resize() {
      this.renderbot.resize();
    }

    destroy() {
      this.renderbot.destroy();
    }
  }

  return MapsVisController;
}

