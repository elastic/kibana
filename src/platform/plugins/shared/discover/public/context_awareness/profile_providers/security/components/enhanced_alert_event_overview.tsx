/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { DocViewerComponent } from '@kbn/unified-doc-viewer/types';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { AlertDescription } from '@kbn/security-solution-flyout';
import { ExpandableSection, useExpandSection } from '@kbn/flyout-ui';
import { getFieldValue } from '@kbn/discover-utils';
import { FLYOUT_STORAGE_KEYS } from '@kbn/security-solution-common';
import { ABOUT_SECTION_TEST_ID } from './test_ids';
import * as i18n from '../translations';

const KEY = 'about';

/**
 * This component is a placeholder for the new alert/event Overview tab content.
 * It will be rendered only when the discover.securitySolutionFlyout feature flag is enabled.
 * The intention keep implementing its content as we're extracting flyout code from the Security Solution plugin to a set of package.
 * The feature flag will remain disabled until we're ready to ship some of the content. The target is to release an MVP by 9.4 then have it fully functional by 9.5.
 */
export const EnhancedAlertEventOverview: DocViewerComponent = ({ hit }) => {
  const isAlert = useMemo(() => {
    const eventKind = getFieldValue(hit, 'event.kind') as string;
    return eventKind === 'signal';
  }, [hit]);

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: true,
  });

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiSpacer size="m" />
      <EuiFlexGroup
        data-test-subj={isAlert ? 'alertOverview' : 'eventOverview'}
        gutterSize="m"
        direction="column"
      >
        <EuiFlexItem>
          <ExpandableSection
            data-test-subj={ABOUT_SECTION_TEST_ID}
            expanded={expanded}
            gutterSize="s"
            localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
            sectionId={KEY}
            title={i18n.aboutSectionTitle}
          >
            {isAlert ? (
              <EuiFlexGroup gutterSize="m" direction="column">
                <EuiFlexItem>
                  <AlertDescription hit={hit} onShowRuleSummary={undefined} />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
          </ExpandableSection>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
