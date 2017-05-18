import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import { VisTypeProvider } from 'ui/vis/vis_types';
import MapsVisTypeMapsRenderbotProvider from './maps_renderbot';

export function MapsVisTypeFactoryProvider(Private) {
  const VisType = Private(VisTypeProvider);
  const MapsRenderbot = Private(MapsVisTypeMapsRenderbotProvider);

  class MapsVisController {
    constructor(el) {
      this.el = el;
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

  class MapsVisTypeFactory extends VisType {
    constructor(opts) {
      if (!opts.responseHandler) {
        opts.responseHandler = 'basic';
      }
      opts.visualization = MapsVisController;
      super(opts);
    }
  }

  return MapsVisTypeFactory;
}
