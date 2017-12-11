// import { ResizeCheckerProvider } from 'ui/resize_checker';
import { VegaView } from './vega_view';

import compactStringify from 'json-stringify-pretty-compact';
// import { VisFactoryProvider } from 'ui/vis/vis_factory';
// import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

export class VegaVisualization {
  constructor(el, vis) {
    console.log('VegaViz constructor');

    this.messages = [];
    this.el = el;
    this.vis = vis;

    // // FIXME!!!!!!!!    Need to inject this value from vegaConfig global var
    // this.vegaConfig = { enableExternalUrls: true };
  }

  /**
   * If the 2nd array parameter in args exists, append it to the warning/error string value
   */
  static expandError(value, args) {
    if (args.length >= 2) {
      try {
        if (typeof args[1] === 'string') {
          value += `\n${args[1]}`;
        } else {
          value += '\n' + compactStringify(args[1], { maxLength: 70 });
        }
      } catch (err) {
        // ignore
      }
    }
    return value;
  }

  onError(error) {
    if (!error) {
      error = 'ERR';
    } else if (error instanceof Error) {
      if (console && console.log) console.log(error);
      error = error.message;
    }

    this.messages.push({ type: 'error', data: VegaVisualization.expandError(error, arguments) });
  }

  onWarn(warning) {
    this.messages.push({ type: 'warning', data: VegaVisualization.expandError(warning, arguments) });
  }

  async render(visData/*, status */) {
    this.messages = [];

    try {
      if (this.vegaView) {
        await this.vegaView.destroy();
      }

      // FIXME:  hackVals should be injected, not passed via visData
      this.vegaView = new VegaView(
        visData.hackVals.vegaConfig, this.el, visData,
        visData.hackVals.serviceSettings,
        this.onError.bind(this), this.onWarn.bind(this));
      await this.vegaView.init();
    } catch (error) {
      this.onError(error);
    }
  }

  destroy() {
    console.log('VegaViz destroying');
  }
}
