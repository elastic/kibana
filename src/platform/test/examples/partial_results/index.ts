/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Serverless test (remove during Scout migration): x-pack/platform/test/serverless/functional/test_suites/examples/partial_results/index.ts
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

/**
 * Migration recommendation: DELETE. Toy expression demo (window mouse events → datatable). Not
 * product coverage. Expression functions in examples/partial_results_example can be unit-tested;
 * search partial-results UI is already a Scout smoke in
 * examples/search_examples/test/scout_examples/ui/tests/partial_results_example.spec.ts
 * (different plugin: Fibonacci progress bar).
 */

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('Partial Results Example', function () {
    before(async () => {
      await PageObjects.common.navigateToApp('partialResultsExample');

      const element = await testSubjects.find('example-help');

      await element.click();
      await element.click();
      await element.click();
    });

    it('should trace mouse events', async () => {
      const events = await Promise.all(
        (
          await testSubjects.findAll('example-column-event')
        ).map((wrapper) => wrapper.getVisibleText())
      );
      expect(events).to.eql(['mousedown', 'mouseup', 'click']);
    });

    it('should keep track of the events number', async () => {
      const counters = await Promise.all(
        (
          await testSubjects.findAll('example-column-count')
        ).map((wrapper) => wrapper.getVisibleText())
      );
      expect(counters).to.eql(['3', '3', '3']);
    });
  });
}
