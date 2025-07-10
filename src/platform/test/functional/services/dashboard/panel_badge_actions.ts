/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const CUSTOM_TIME_RANGE_BADGE_DATA_TEST_SUBJ = 'embeddablePanelBadge-CUSTOM_TIME_RANGE_BADGE';

export function DashboardBadgeActionsProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  return new (class DashboardBadgeActions {
    async expectExistsTimeRangeBadgeAction() {
      log.debug('expectExistsTimeRangeBadgeAction');
      await testSubjects.existOrFail(CUSTOM_TIME_RANGE_BADGE_DATA_TEST_SUBJ);
    }

    async expectMissingTimeRangeBadgeAction() {
      log.debug('expectMissingTimeRangeBadgeAction');
      await testSubjects.missingOrFail(CUSTOM_TIME_RANGE_BADGE_DATA_TEST_SUBJ);
    }

    async clickTimeRangeBadgeAction() {
      log.debug('clickTimeRangeBadgeAction');
      await this.expectExistsTimeRangeBadgeAction();
      await testSubjects.click(CUSTOM_TIME_RANGE_BADGE_DATA_TEST_SUBJ);
    }
  })();
}
