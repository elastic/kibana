/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { showCspWarningIfNeeded } from './csp_warning';
export type { CspWarningDeps } from './csp_warning';

export { setupAppChangeHandler } from './app_change_handler';
export type { AppChangeHandlerDeps } from './app_change_handler';

export { handleEuiDevProviderWarning } from './handle_eui_dev_provider_warning';
export { handleEuiFullScreenChanges } from './handle_eui_fullscreen_changes';
export { handleSystemColorModeChange } from './handle_system_colormode_change';

export { handleBodyClasses } from './handle_body_classes';
export type { BodyClassesSideEffectDeps } from './handle_body_classes';
