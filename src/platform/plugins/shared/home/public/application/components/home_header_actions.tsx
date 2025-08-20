/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiImage,
  EuiTitle,
} from '@elastic/eui';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { i18n } from '@kbn/i18n';
import { MoveData } from './move_data';

interface HomeHeaderActionsProps {
  currentUserName: string | undefined;
  addBasePath: (url: string) => string;
  application: any;
  isCloudEnabled: boolean;
  isDarkMode: boolean;
  trackUiMetric: (...args: any[]) => void;
  createAppNavigationHandler: (
    path: string
  ) => (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const HomeHeaderActions = ({
  addBasePath,
  application,
  isCloudEnabled,
  isDarkMode,
  trackUiMetric,
  createAppNavigationHandler,
  currentUserName,
}: HomeHeaderActionsProps) => (
  <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd">
    <EuiFlexItem grow={true}>
      <EuiTitle size="l">
        <h1>
          {i18n.translate('home.header.welcome', { defaultMessage: 'Welcome home' })}
          {currentUserName ? `, ${currentUserName}!` : ''}
        </h1>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        iconType="importAction"
        href={addBasePath('#/tutorial_directory/fileDataViz')}
        data-test-subj="uploadFileButton"
      >
        {i18n.translate('home.header.uploadFileButton', {
          defaultMessage: 'Upload a file',
        })}
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <RedirectAppLinks coreStart={{ application }}>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiButton
          data-test-subj="homeAddData"
          fill={true}
          href={addBasePath('/app/integrations/browse')}
          iconType="plusInCircle"
          onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
            trackUiMetric('CLICK', 'home_tutorial_directory');
            createAppNavigationHandler('/app/integrations/browse')(event);
          }}
          fullWidth
        >
          {i18n.translate('home.header.addIntegrationsButton', {
            defaultMessage: 'Add integrations',
          })}
        </EuiButton>
      </RedirectAppLinks>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      {/* {!isCloudEnabled ? (
        <MoveData addBasePath={addBasePath} />
      ) : ( */}
      <EuiImage
        alt={i18n.translate('home.addData.illustration.alt.text', {
          defaultMessage: 'Illustration of Elastic data integrations',
        })}
        src={
          addBasePath('/plugins/kibanaReact/assets/') +
          (isDarkMode
            ? 'illustration_integrations_darkmode.svg'
            : 'illustration_integrations_lightmode.svg')
        }
        style={{ height: 80, width: 'auto' }}
      />
      {/* )} */}
    </EuiFlexItem>
  </EuiFlexGroup>
);
