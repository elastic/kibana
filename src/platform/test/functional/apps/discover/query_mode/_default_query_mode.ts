/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const { discover, common } = getPageObjects(['discover', 'common']);

  describe('Default query mode', () => {
    afterEach(async () => {
      await discover.resetQueryMode();
    });

    beforeEach(async () => {
      await common.navigateToApp('discover');
    });

    describe('when the default query mode is ES|QL', () => {
      it('should open Discover in ES|QL mode', async () => {
        await discover.setQueryMode('esql');
        await common.navigateToApp('discover');
        await discover.expectSourceViewerToExist();
      });
    });

    describe('when the default query mode is classic', () => {
      it('should open Discover in classic mode', async () => {
        await discover.setQueryMode('classic');
        await common.navigateToApp('discover');
        await testSubjects.existOrFail('discover-dataView-switch-link');
      });
    });

    describe('when the default query mode is unset', () => {
      it('should open Discover in classic mode', async () => {
        await discover.resetQueryMode();
        await common.navigateToApp('discover');
        await testSubjects.existOrFail('discover-dataView-switch-link');
      });
    });
  });
}
