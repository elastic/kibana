/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PageObjects,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { AnnotationListingPage } from './page_objects';

export interface AnnotationListingTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    annotationListing: AnnotationListingPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  AnnotationListingTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AnnotationListingTestFixtures['pageObjects'];
      page: AnnotationListingTestFixtures['page'];
    },
    use: (pageObjects: AnnotationListingTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      annotationListing: createLazyPageObject(AnnotationListingPage, page),
    });
  },
});
