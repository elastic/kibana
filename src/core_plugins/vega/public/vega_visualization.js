// import { ResizeCheckerProvider } from 'ui/resize_checker';
import { VegaView, ViewUtils } from './vega_view';

// import { VisFactoryProvider } from 'ui/vis/vis_factory';
// import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

export function VegaVisualizationProvider(vegaConfig, serviceSettings) {
  return class VegaVisualization {
    constructor(el, vis) {
      console.log('VegaViz constructor');

      this.messages = [];
      this.el = el;
      this.vis = vis;
    }

    onError(error) {
      if (!error) {
        error = 'ERR';
      } else if (error instanceof Error) {
        if (console && console.log) console.log(error);
        error = error.message;
      }

      this.messages.push(ViewUtils.makeErrorMsg(error, ...Array.from(arguments).slice(1)));
    }

    onWarn() {
      this.messages.push(ViewUtils.makeErrorMsg(...arguments));
    }

    /**
     *
     * @param {VegaParser} visData
     * @returns {Promise<void>}
     */
    async render(visData/*, status */) {
      this.messages = visData.warnings;

      try {
        if (this.vegaView) {
          await this.vegaView.destroy();
        }

        // FIXME:  hackVals should be injected, not passed via visData
        this.vegaView = new VegaView(
          vegaConfig, this.el, visData, serviceSettings,
          this.onError.bind(this), this.onWarn.bind(this));
        await this.vegaView.init();
      } catch (error) {
        this.onError(error);
      }
    }

    destroy() {
      console.log('VegaViz destroying');
    }
  };
}
