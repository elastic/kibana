/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import { EuiButtonEmpty, EuiSwitch } from '@elastic/eui';
import { ExportJsonFlyoutContent } from '@kbn/as-code-export-flyout-component';
import { i18n } from '@kbn/i18n';
import type {
  ExportShareParameters,
  SharePluginStart,
  SharingData,
} from '@kbn/share-plugin/public';
import { downloadFileAs } from '@kbn/share-plugin/public';
import type { ShareIntegration } from '@kbn/share-plugin/public/types';

import { DISCOVER_SESSION_API_BASE_PATH } from '../../../../../../common/constants';
import type { DiscoverSessionApiData } from '../../../../../../server';

export type DiscoverExportJsonSharingData = SharingData & {
  getExportJson: (exportAllTabs?: boolean) => {
    data: DiscoverSessionApiData;
    warnings: readonly string[];
  };
};

export interface DiscoverExportJsonShare
  extends ShareIntegration<ExportShareParameters, DiscoverExportJsonSharingData> {
  groupId: 'exportDerivatives';
}

interface ExportJsonConfigDependencies {
  canShowDevTools: boolean;
  objectType: string;
  sharingData: DiscoverExportJsonSharingData;
  useConsoleUrl: SharePluginStart['url']['locators']['useUrl'];
}

export const createExportJsonConfig = (
  dependencies: ExportJsonConfigDependencies
): ExportShareParameters => ({
  label: ({ openFlyout }) => (
    <EuiButtonEmpty
      size="s"
      iconType="code"
      onClick={openFlyout}
      data-test-subj="exportMenuItem-JSON"
    >
      {i18n.translate('discover.exportJson.label', {
        defaultMessage: 'JSON',
      })}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: {
    size: 'm',
    maxWidth: 1000,
  },
  flyoutContent: ({ closeFlyout }) => (
    <ExportDiscoverSessionJsonFlyout closeFlyout={closeFlyout} {...dependencies} />
  ),
});

interface ExportJsonSelection {
  exportAllTabs: boolean;
}

const ExportDiscoverSessionJsonFlyout = ({
  canShowDevTools,
  closeFlyout,
  objectType,
  sharingData: { getExportJson, title },
  useConsoleUrl,
}: { closeFlyout: () => void } & ExportJsonConfigDependencies) => {
  const [exportAllTabs, setExportAllTabs] = useState(true);
  const getExportJsonSelection = useCallback(() => ({ exportAllTabs }), [exportAllTabs]);
  const prepareExportJson = useCallback(
    async ({ exportAllTabs: shouldExportAllTabs }: ExportJsonSelection) =>
      getExportJson(shouldExportAllTabs),
    [getExportJson]
  );

  return (
    <ExportJsonFlyoutContent<ExportJsonSelection, DiscoverSessionApiData>
      closeFlyout={closeFlyout}
      dataTestSubjPrefix="discover"
      downloadExportJson={(filename, content) =>
        downloadFileAs(filename, { content, type: 'application/json' })
      }
      getExportJson={getExportJsonSelection}
      headerActions={
        <EuiSwitch
          compressed
          checked={exportAllTabs}
          data-test-subj="discoverExportJsonAllTabsSwitch"
          label={i18n.translate('discover.exportJson.exportAllTabsToggleSwitch', {
            defaultMessage: 'Export all tabs',
          })}
          onChange={(event) => setExportAllTabs(event.target.checked)}
        />
      }
      isTechnicalPreview
      objectType={objectType}
      openInConsole={{
        canShow: canShowDevTools,
        getRequest: (jsonValue) => `POST kbn:${DISCOVER_SESSION_API_BASE_PATH}\n${jsonValue}`,
        useUrl: useConsoleUrl,
      }}
      prepareExportJson={prepareExportJson}
      title={title}
    />
  );
};
