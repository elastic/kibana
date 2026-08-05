/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('@kbn/vega-sandbox bootstrap smoke', () => {
  it('loads without Kibana runtime globals present', async () => {
    // The sandbox bundle must not rely on the main Kibana runtime.
    (window as any).__kbnBundles__ = undefined;
    (window as any).__kbnPublicPath__ = undefined;

    document.body.innerHTML = '<div id="vega-sandbox-root"></div>';

    await expect(import('@kbn/vega-sandbox/src/bootstrap')).resolves.toBeDefined();
  });
});
