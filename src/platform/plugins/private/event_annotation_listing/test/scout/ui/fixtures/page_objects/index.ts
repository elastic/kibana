/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<<< HEAD:src/platform/plugins/private/event_annotation_listing/test/scout/ui/fixtures/page_objects/index.ts
export { AnnotationListingPage } from './annotation_listing_page';
========
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
} as const;

export const INTERNAL_HEADERS = {
  ...COMMON_HEADERS,
  'x-elastic-internal-origin': 'kibana',
} as const;
>>>>>>>> 9.4:src/core/test/scout/api/fixtures/constants.ts
