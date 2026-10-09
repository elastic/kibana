/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export { LanguageDocumentationPopover } from './src/components/as_popover';
export { LanguageDocumentationPopoverContent } from './src/components/as_popover/popover_content';
export { LanguageDocumentationFlyout } from './src/components/as_flyout';
export { LanguageDocumentationInline } from './src/components/as_inline';
export type { LanguageDocumentationSections } from './src/types';

// Used by the ES|QL documentation generation scripts in @kbn/esql-scripts
export { getLicenseInfoForFunctions, getLicenseInfoForCommand } from './src/utils/get_license_info';
export type { FunctionDefinition, CommandDefinition, MultipleLicenseInfo } from './src/types';
