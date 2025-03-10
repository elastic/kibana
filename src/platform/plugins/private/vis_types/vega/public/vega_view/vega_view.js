/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { View, parse } from 'vega';
import { VegaBaseView } from './vega_base_view';

export class VegaView extends VegaBaseView {
  async _initViewCustomizations() {
    // In some cases, Vega may be initialized twice... TBD
    if (!this._container) return;

    const view = new View(parse(this._parser.spec, undefined, { ast: true }), this._vegaViewConfig);

    if (this._parser.useResize) this.updateVegaSize(view);
    view.initialize(this._container, this._controls);
    // resize again to take controls into account
    if (this._parser.useResize) this.updateVegaSize(view);

    if (this._parser.useHover) view.hover();

    await this.setView(view);
    this.setDebugValues(view, this._parser.spec, this._parser.vlspec);
  }
}
