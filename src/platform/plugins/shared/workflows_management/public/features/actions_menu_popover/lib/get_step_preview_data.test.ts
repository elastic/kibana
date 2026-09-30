/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepPreviewData } from './get_step_preview_data';
import { getFieldsFromZodSchema } from './get_step_preview_fields';

describe('getStepPreviewData', () => {
  it('returns schemas for built-in steps', () => {
    const previewData = getStepPreviewData('wait');

    expect(getFieldsFromZodSchema(previewData.inputSchema)).not.toHaveLength(0);
    expect(previewData.outputSchema).toBeDefined();
  });
});
