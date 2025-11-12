/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { coreServices } from '../services/kibana_services';
import { DashboardListingEmptyPrompt } from './dashboard_listing_empty_prompt';
import type { DashboardListingProps } from './types';

type ContentType = 'dashboards' | 'visualizations' | 'annotation-groups';

interface Props {
  createItem?: () => void;
  disableCreateDashboardButton?: boolean;
  goToDashboard: DashboardListingProps['goToDashboard'];
  setUnsavedDashboardIds: (ids: string[]) => void;
  unsavedDashboardIds: string[];
  useSessionStorageIntegration?: boolean;
}

export const SmartEmptyPrompt = (props: Props) => {
  const [currentTab, setCurrentTab] = useState<ContentType>('dashboards');

  // Listen to URL changes to detect tab switches
  useEffect(() => {
    const checkTab = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const tab = (params.get('contentTypeTab') || 'dashboards') as ContentType;
      setCurrentTab(tab);
    };

    checkTab();
    // Check on hash changes
    window.addEventListener('hashchange', checkTab);
    return () => window.removeEventListener('hashchange', checkTab);
  }, []);

  // Show annotation groups empty prompt when on that tab
  if (currentTab === 'annotation-groups') {
    return (
      <EuiEmptyPrompt
        color="transparent"
        iconType="flag"
        title={
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="dashboard.listing.annotationGroups.emptyPrompt.title"
                defaultMessage="Create your first annotation in Lens"
              />
            </h2>
          </EuiTitle>
        }
        body={
          <p>
            <FormattedMessage
              id="dashboard.listing.annotationGroups.emptyPrompt.body"
              defaultMessage="You can create and save annotations for use across multiple visualizations in the Lens editor."
            />
          </p>
        }
        actions={
          <EuiButton
            onClick={() => {
              coreServices.application.navigateToApp('lens');
            }}
            data-test-subj="createAnnotationInLensButton"
          >
            <FormattedMessage
              id="dashboard.listing.annotationGroups.emptyPrompt.cta"
              defaultMessage="Create annotation in Lens"
            />
          </EuiButton>
        }
      />
    );
  }

  // Show default dashboard empty prompt for other tabs
  return (
    <DashboardListingEmptyPrompt
      createItem={props.createItem}
      disableCreateDashboardButton={props.disableCreateDashboardButton}
      goToDashboard={props.goToDashboard}
      setUnsavedDashboardIds={props.setUnsavedDashboardIds}
      unsavedDashboardIds={props.unsavedDashboardIds}
      useSessionStorageIntegration={props.useSessionStorageIntegration}
    />
  );
};

