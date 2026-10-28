/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from '../../all_specs';
import { getConnectorSpec } from '../../get_connector_spec';

describe('mcp spec is not in connectorsSpecs', () => {
  it('is not returned by getConnectorSpec', () => {
    expect(getConnectorSpec('.mcp')).toBeUndefined();
  });

  it('is not a member of connectorsSpecs', () => {
    expect(Object.values(connectorsSpecs).map((spec) => spec.metadata.id)).not.toContain('.mcp');
  });
});
