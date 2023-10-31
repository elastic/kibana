/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

const AiAssistantSettingsPage = ({
  coreStart,
  dataStart,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('aiAssistantManagment.breadcrumb.index', {
          defaultMessage: 'AI Assistant',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <>
      <EuiTitle size="l">
        <h2>Bla</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiText>Bla</EuiText>

      <EuiSpacer size="l" />
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export { AiAssistantSettingsPage as default };
