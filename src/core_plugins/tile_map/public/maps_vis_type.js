import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import { VisTypeProvider } from 'ui/vis/vis_types';
import MapsVisTypeMapsRenderbotProvider from './maps_renderbot';

export function MapsVisTypeFactoryProvider(Private) {
  const VisType = Private(VisTypeProvider);
  const MapsRenderbot = Private(MapsVisTypeMapsRenderbotProvider);

  class MapsVisTypeFactory extends VisType {
    constructor(opts) {
      if (!opts.responseHandler) {
        opts.responseHandler = 'basic';
      }
      super(opts);
    }

    render(vis, $el, uiState, esResponse) {
      return new Promise(resolve => {
        if (!this.renderbot) {
          this.renderbot = new MapsRenderbot(vis, $el, uiState);
        }
        this.renderbot.render(esResponse);
        resolve();
      });
    }

    destroy() {
      this.renderbot.destroy();
    }
  }

  return MapsVisTypeFactory;
}
