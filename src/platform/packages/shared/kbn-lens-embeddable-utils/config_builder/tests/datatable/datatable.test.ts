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
  singleMetricDatatableAttributes,
  singleMetricRowSplitDatatableAttributes,
  multiMetricRowSplitDatatableAttributes,
  fullConfigDatatableAttributes,
  sortedByTransposedMetricColumnDatatableAttributes,
  sortedByRowDatatableAttributes,
} from './lens_state_config_dsl.mock';
import {
  singleMetricESQLDatatableAttributes,
  singleMetricRowSplitESQLDatatableAttributes,
  multipleMetricRowSplitESQLDatatableAttributes,
  fullConfigESQLDatatableAttributes,
  sortedByTransposedMetricColumnESQLDatatableAttributes,
} from './lens_state_config_esql.mock';

describe('Datatable', () => {
  describe('validateConverter', () => {
    it('should convert a datatable chart with single metric column', () => {
      validateConverter(singleMetricDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart with single metric, row, split by columns', () => {
      validateConverter(singleMetricRowSplitDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by columns', () => {
      validateConverter(multiMetricRowSplitDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by with full config', () => {
      validateConverter(fullConfigDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart sorted by a transposed metric column', () => {
      validateConverter(sortedByTransposedMetricColumnDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart sorted by a row', () => {
      validateConverter(sortedByRowDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with single metric column', () => {
      validateConverter(singleMetricESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with single metric, row, split by columns', () => {
      validateConverter(singleMetricRowSplitESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by columns', () => {
      validateConverter(multipleMetricRowSplitESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by with full config', () => {
      validateConverter(fullConfigESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart sorted by a transposed metric column', () => {
      validateConverter(
        sortedByTransposedMetricColumnESQLDatatableAttributes,
        datatableStateSchema
      );
    });
  });
});
