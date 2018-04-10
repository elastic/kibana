import * as vega from 'vega-lib';
import { vega as tooltipVega, vegaLite as tooltipVegaLite } from 'vega-tooltip';
import { VegaBaseView } from './vega_base_view';

export class VegaView extends VegaBaseView {
  async _initViewCustomizations() {
    // In some cases, Vega may be initialized twice... TBD
    if (!this._$container) return;

    const view = new vega.View(vega.parse(this._parser.spec), this._vegaViewConfig);
    this.setDebugValues(view, this._parser.spec, this._parser.vlspec);

    view.warn = this.onWarn.bind(this);
    view.error = this.onError.bind(this);
    if (this._parser.useResize) this.updateVegaSize(view);
    view.initialize(this._$container.get(0), this._$controls.get(0));

    if (this._parser.useHover) view.hover();

    this._addDestroyHandler(() => {
      this._view = null;
      view.finalize();
    });

    await view.runAsync();
    this._view = view;



    // TODO: move this to base


    if (this._parser.tooltips) {
      const opts = typeof this._parser.tooltips === 'object' ? this._parser.tooltips : undefined;

      let tooltipObj;
      if (this._parser.isVegaLite) {
        tooltipObj = tooltipVegaLite(view, this._parser.vlspec, opts);
      } else {
        tooltipObj = tooltipVega(view, opts);
      }

      this._addDestroyHandler(() => {
        tooltipObj.destroy();
      });
    }
  }
}
