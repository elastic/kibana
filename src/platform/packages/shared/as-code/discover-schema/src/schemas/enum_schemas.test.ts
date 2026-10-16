/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-session-constants';
import { discoverSessionApiControlPanelSchema } from './control_panel';
import { dataTableSchema } from './data_table';
import { discoverSessionApiEmbeddableOverridesSchema } from './embeddable_overrides';
import { discoverSessionApiClassicTabSchema } from './session_data';
import { viewModeSchema } from './view_mode';
import { visContextSchema } from './vis_context';

describe.each([
  {
    field: 'width',
    schema: discoverSessionApiControlPanelSchema.shape.width,
    values: ['small', 'medium', 'large'],
  },
  {
    field: 'chart_interval',
    schema: discoverSessionApiClassicTabSchema.shape.chart_interval,
    values: ['auto', 'ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'],
  },
  { field: 'view_mode', schema: viewModeSchema, values: ['documents', 'patterns', 'aggregated'] },
  {
    field: 'density',
    schema: dataTableSchema.shape.density,
    values: ['compact', 'expanded', 'normal'],
  },
  {
    field: 'density override',
    schema: discoverSessionApiEmbeddableOverridesSchema.unwrap().shape.density,
    values: ['compact', 'expanded', 'normal'],
  },
  {
    field: 'documents_display_mode',
    schema: dataTableSchema.shape.documents_display_mode,
    values: ['table', 'json'],
  },
  {
    field: 'suggestion_type',
    schema: visContextSchema.shape.suggestion_type,
    values: [
      UnifiedHistogramSuggestionType.lensSuggestion,
      UnifiedHistogramSuggestionType.histogramForESQL,
      UnifiedHistogramSuggestionType.histogramForDataView,
    ],
  },
])('$field', ({ field, schema, values }) => {
  it('accepts the supported values and describes invalid input with a single enum issue', () => {
    for (const value of values) {
      expect(schema.parse(value)).toBe(value);
    }

    const result = z.object({ [field]: schema }).safeParse({ [field]: 'unsupported' });
    if (result.success) throw new Error('Expected an invalid enum value');

    expect(result.error.issues).toEqual([
      expect.objectContaining({ code: 'invalid_value', path: [field], values }),
    ]);
    expect(z.toJSONSchema(schema)).toEqual(expect.objectContaining({ enum: values }));
  });
});
