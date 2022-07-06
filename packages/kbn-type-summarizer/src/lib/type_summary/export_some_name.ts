/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NamedExportDetails } from '../export_details';

/**
 * Create an export statement for some name already in scope
 */
export const exportSomeName = ({ name, typeOnly }: NamedExportDetails, localName: string) => {
  return `export ${typeOnly ? `type ` : ''}{${
    name === localName ? name : `${localName} as ${name}`
  }}\n`;
};
