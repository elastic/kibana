/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { version as vegaVersion } from 'vega';
import { version as vegaLiteVersion } from 'vega-lite';
import { renderVegaDescriptor } from './render';

declare global {
  interface Window {
    __kbnVegaSandbox__?: {
      renderVegaDescriptor: typeof renderVegaDescriptor;
      versions: {
        vega: string;
        vegaLite: string;
      };
    };
  }
}

window.__kbnVegaSandbox__ = {
  renderVegaDescriptor,
  versions: {
    vega: vegaVersion,
    vegaLite: vegaLiteVersion,
  },
};
