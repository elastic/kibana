/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { View, parse } from 'vega';
import { VegaBaseView } from './vega_base_view';

export class VegaView extends VegaBaseView {
  async _initViewCustomizations() {
    // In some cases, Vega may be initialized twice... TBD
    if (!this._$container) return;

    const view = new View(parse(this._parser.spec, undefined, { ast: true }), this._vegaViewConfig);

    if (this._parser.useResize) this.updateVegaSize(view);
    view.initialize(this._$container.get(0), this._$controls.get(0));
    // resize again to take controls into account
    if (this._parser.useResize) this.updateVegaSize(view);

    if (this._parser.useHover) view.hover();

    await this.setView(view);
    this.setDebugValues(view, this._parser.spec, this._parser.vlspec);
  }
}
