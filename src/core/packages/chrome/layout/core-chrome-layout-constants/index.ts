/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The ID of the main scroll container in the application.
 * `document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID)` can be used to find the main scroll container
 */
export const APP_MAIN_SCROLL_CONTAINER_ID = 'app-main-scroll';

/**
 * The ID of the fixed viewport container in the application.
 * This div is rendered by the `AppFixedViewport` component on the top of the application area and can be used to render fixed elements that should not scroll with the main content.
 */
export const APP_FIXED_VIEWPORT_ID = 'app-fixed-viewport';
