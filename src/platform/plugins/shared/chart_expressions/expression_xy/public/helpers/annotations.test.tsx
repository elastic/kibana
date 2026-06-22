/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import { getGroupedAnnotationTextColor } from './annotations';

describe('annotation helpers', () => {
  describe('getGroupedAnnotationTextColor', () => {
    it('uses the dark theme text token on dark annotation colors', () => {
      expect(getGroupedAnnotationTextColor('#2B394F')).toBe(euiDarkVars.euiColorTextParagraph);
    });

    it('uses the light theme text token on light annotation colors', () => {
      expect(getGroupedAnnotationTextColor('#FFFFFF')).toBe(euiLightVars.euiColorTextParagraph);
    });
  });
});
