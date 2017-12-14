import { VegaView } from './vega_view';

export function VegaVisualizationProvider(vegaConfig, serviceSettings) {
  return class VegaVisualization {
    constructor(el, vis) {
      // fixme: remove
      console.log('VegaVisualization constructor');

      this._el = el;
      this._vis = vis;
    }

    /**
     *
     * @param {VegaParser} visData
     * @param {*} status
     * @returns {Promise<void>}
     */
    async render(visData, status) {
      if (!visData && !this._vegaView) {
        console.log('Unable to render without data', status);
        return;
      }

      // fixme: remove
      console.log('** render **', visData, status);

      try {
        if (visData && (status.data || !this._vegaView)) {
          // New data received, rebuild the graph
          if (this._vegaView) {
            await this._vegaView.destroy();
            this._vegaView = null;
          }
          this._vegaView = new VegaView(vegaConfig, this._el, visData, serviceSettings);
          await this._vegaView.init();
        } else if (status.resize) {
          // fixme: remove
          console.log('VegaVisualization resizing');

          // the graph has been resized
          await this._vegaView.resize();
        }

      } catch (error) {
        if (this._vegaView) {
          this._vegaView.onError(error);
        } else {
          // Shouldn't happen, but just in case to avoid silent ignores
          // fixme: make this error appear at the top of Kibana
          console.log(error);
        }
      }
    }

    destroy() {
      // fixme: remove
      console.log('VegaVisualization destroying');

      return this._vegaView && this._vegaView.destroy();
    }
  };
}
