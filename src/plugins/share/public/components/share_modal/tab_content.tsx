/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { Capabilities } from '@kbn/core-capabilities-common';
import { AnonymousAccessServiceContract, LocatorPublic } from '../../../common';
import { BrowserUrlService, UrlParamExtension } from '../../types';

interface TabContentProps {
  allowShortUrl: boolean;
  isEmbedded?: boolean;
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  shareableUrlForSavedObject?: string;
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  urlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
}

export const TabContent: FC<TabContentProps> = () => {
  return (
    <I18nProvider>
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareUrlForm">
        {/* {renderExportAsRadioGroup()}
        {renderUrlParamExtensions()}
        {urlRow} */}
        <EuiSpacer size="m" />
        {/* {copyButton} */}
      </EuiForm>
    </I18nProvider>
  );
};
