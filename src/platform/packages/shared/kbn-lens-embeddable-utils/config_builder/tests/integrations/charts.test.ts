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
import { validator } from '../utils/validator';
import type { LensAttributes } from '../..';
import { groupBy, camelCase } from 'lodash';
import { LensConfigBuilder } from '../../config_builder';

const files = fs.readFileSync(path.join(__dirname, './lens_panels.json'), 'utf-8');
const panels = JSON.parse(files || '[]').slice(0, 100) as Record<string, LensAttributes>[];

const builder = new LensConfigBuilder(undefined, true);

describe('Integration panels', () => {
  // group panels by type
  const panelsByType = groupBy(panels, (panel) => panel.attributes.visualizationType);
  for (const [chartType, panelsOfType] of Object.entries(panelsByType)) {
    if (builder.isSupported(chartType)) {
      describe(`Type ${chartType}`, () => {
        const panelsByPackage = groupBy(panelsOfType, (panel) => panel.package_name);

        describe.each(Object.entries(panelsByPackage))('Package %s', (_, p) => {
          it.each(
            p.map(({ panel_title: title, attributes }) => [title, attributes]) // block indent
          )('should convert the panel - %s', (_title, attributes) => {
            const type = camelCase(builder.getCompatibleType(chartType) ?? '');
            const typeValidator = validator[type as keyof typeof validator];

            if (typeValidator) {
              validator[type as keyof typeof validator].fromState(attributes);
            } else {
              throw new Error(`No validator found for type: ${type}(${chartType})`);
            }
          });
        });
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
