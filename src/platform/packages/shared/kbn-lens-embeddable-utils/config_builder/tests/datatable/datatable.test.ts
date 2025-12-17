/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { datatableStateSchema } from '../../schema';
import { validateConverter } from '../validate';
import {
  singleMetricAttributesDatatable,
  singleMetricRowSplitAttributesDatatable,
  multiMetricRowSplitAttributesDatatable,
  fullConfigAttributesDatatable,
} from './lens_state_config.mock';

describe('Datatable', () => {
  describe('validateConverter', () => {
    it('should convert a datatable chart with single metric column', () => {
      validateConverter(singleMetricAttributesDatatable, datatableStateSchema);
    });

    it('should convert a datatable chart with full config', () => {
      validateConverter(singleMetricRowSplitAttributesDatatable, datatableStateSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by', () => {
      validateConverter(multiMetricRowSplitAttributesDatatable, datatableStateSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by with full config', () => {
      validateConverter(fullConfigAttributesDatatable, datatableStateSchema);
    });
  });
});
