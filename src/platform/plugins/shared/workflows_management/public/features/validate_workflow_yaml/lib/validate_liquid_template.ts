/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateLiquidTemplate as validateLiquidTemplateCommon } from '../../../../common/lib/validate_liquid_template';
import type { YamlValidationResult } from '../model/types';

export function validateLiquidTemplate(yamlString: string): YamlValidationResult[] {
  const errors = validateLiquidTemplateCommon(yamlString);

  return errors.map((error) => ({
    id: `liquid-template-${error.startLine}-${error.startColumn}-${error.endLine}-${error.endColumn}`,
    owner: 'liquid-template-validation' as const,
    message: error.message,
    startLineNumber: error.startLine,
    startColumn: error.startColumn,
    endLineNumber: error.endLine,
    endColumn: error.endColumn,
    severity: 'error' as const,
    hoverMessage: error.message,
  }));
}
