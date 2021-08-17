/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApplicationStart } from 'kibana/public';
import { RedirectAppLinks } from '../../app_links';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  hidden?: boolean;
  showDevToolsLink?: boolean;
  showManagementLink?: boolean;
}

export const overviewPageActions = ({
  addBasePath,
  application,
  hidden,
  showDevToolsLink,
  showManagementLink,
}: Props) => {
  const {
    management: isManagementEnabled,
    dev_tools: isDevToolsEnabled,
  } = application.capabilities.navLinks;

  const actionAddData = (
    <RedirectAppLinks application={application}>
      <EuiButtonEmpty
        data-test-subj="homeAddData"
        className="kbnOverviewPageHeader__actionButton"
        flush="both"
        href={addBasePath('/app/home#/tutorial_directory')}
        iconType="plusInCircle"
      >
        {i18n.translate('kibana-react.kbnOverviewPageHeader.addDataButtonLabel', {
          defaultMessage: 'Add data',
        })}
      </EuiButtonEmpty>
    </RedirectAppLinks>
  );

  const actionStackManagement =
    showManagementLink && isManagementEnabled ? (
      <RedirectAppLinks application={application}>
        <EuiButtonEmpty
          data-test-subj="homeManage"
          className="kbnOverviewPageHeader__actionButton"
          flush="both"
          iconType="gear"
          href={addBasePath('/app/management')}
        >
          {i18n.translate('kibana-react.kbnOverviewPageHeader.stackManagementButtonLabel', {
            defaultMessage: 'Manage',
          })}
        </EuiButtonEmpty>
      </RedirectAppLinks>
    ) : null;

  const actionDevTools =
    showDevToolsLink && isDevToolsEnabled ? (
      <RedirectAppLinks application={application}>
        <EuiButtonEmpty
          data-test-subj="homeDevTools"
          className="kbnOverviewPageHeader__actionButton"
          flush="both"
          iconType="wrench"
          href={addBasePath('/app/dev_tools#/console')}
        >
          {i18n.translate('kibana-react.kbnOverviewPageHeader.devToolsButtonLabel', {
            defaultMessage: 'Dev tools',
          })}
        </EuiButtonEmpty>
      </RedirectAppLinks>
    ) : null;

  const actions = [actionAddData, actionStackManagement, actionDevTools];

  return !hidden ? actions.filter((obj) => obj) : [];
};
