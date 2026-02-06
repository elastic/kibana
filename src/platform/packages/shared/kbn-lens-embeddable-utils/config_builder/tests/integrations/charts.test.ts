/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';
import { validateConverter } from '../validate';
import type { LensAttributes } from '../..';
import { groupBy } from 'lodash';
import { schema } from '@kbn/config-schema';
import { reshapeAttributes } from './so_comparison';

describe('Integration panels', () => {
  const files = fs.readFileSync(path.join(__dirname, './lens_panels.json'), 'utf-8');
  const panels = JSON.parse(files || '[]') as Record<string, LensAttributes>[];

  // group panels by type
  const panelsByType = groupBy(panels, (panel) => panel.attributes.visualizationType);
  for (const [chartType, panelsOfType] of Object.entries(panelsByType)) {
    if (['lnsXY', 'lnsGauge', 'lnsMetric', 'lnsLegacyMetric'].includes(chartType)) {
      describe(`Type ${chartType}`, () => {
        it.each(panelsOfType.map(({ title, attributes }) => [title, attributes]))(
          'should convert the panel %s',
          (_title, attributes) => {
            const newAttributes = validateConverter(attributes, schema.any());
            expect(reshapeAttributes(attributes)).toEqual(newAttributes);
          }
        );
      });
    } else {
      describe(`Type ${chartType}`, () => {
        it.skip.each(panelsOfType.map(({ title, attributes }) => [title, attributes]))(
          'should convert the panel %s',
          () => {}
        );
      });
    }
  }
});
