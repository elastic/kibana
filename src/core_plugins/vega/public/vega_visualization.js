import $ from 'jquery';
import { VegaView, ViewUtils } from './vega_view';

export function VegaVisualizationProvider(vegaConfig, serviceSettings) {
  return class VegaVisualization {
    constructor(el, vis) {
      // fixme: remove
      console.log('VegaVisualization constructor');

      this.messages = [];
      this.el = $(el);
      this.vis = vis;

      this.el.addClass('vega-main');

// <ul ng-if="vega.messages.length" class="vega-messages">
//   <li ng-repeat="message in vega.messages"
//       ng-class="{error: 'vega-message-err', warning: 'vega-message-warn'}[message.type]"
//   >
//     <pre>{{message.data}}</pre>
//   </li>
// </ul>
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
     * @param {*} status
     * @returns {Promise<void>}
     */
    async render(visData, status) {

      if (!visData && !this.vegaView) {
        console.log('Unable to render without data', status);
        return;
      }

      // fixme: remove
      console.log('** render **', visData, status);

      try {
        if (visData && (status.data || !this.vegaView)) {
          // New data received, rebuild the graph
          if (this.vegaView) {
            await this.vegaView.destroy();
            this.vegaView = null;
          }
          this.vegaView = new VegaView(
            vegaConfig, this.el, visData, serviceSettings,
            this.onError.bind(this), this.onWarn.bind(this));

          await this.vegaView.init();
        } else if (status.resize) {
          // the graph has been resized
          // fixme: remove
          console.log('VegaVisualization resizing');
          await this.vegaView.resize();
        }

      } catch (error) {
        this.onError(error);
      }
    }

    destroy() {
      // fixme: remove
      console.log('VegaVisualization destroying');
    }
  };
}
