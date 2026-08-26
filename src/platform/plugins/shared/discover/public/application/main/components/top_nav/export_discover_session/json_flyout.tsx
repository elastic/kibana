/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import { EuiFlyout, EuiSwitch, useGeneratedHtmlId } from '@elastic/eui';
import { ExportJsonFlyoutContent } from '@kbn/as-code-export-flyout-component';
import { i18n } from '@kbn/i18n';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { downloadFileAs } from '@kbn/share-plugin/public';

import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../../../../../common/constants';
import type {
  DiscoverSessionApiData,
  DiscoverSessionSanitizeRequest,
} from '../../../../../../server';

interface ExportDiscoverSessionJsonFlyoutProps {
  canShowDevTools: boolean;
  closeFlyout: () => void;
  getExportJson: (exportCurrentTab: boolean) => DiscoverSessionSanitizeRequest;
  sanitizeExportJson: (state: DiscoverSessionSanitizeRequest) => Promise<{
    data: DiscoverSessionApiData;
    warnings: readonly string[];
  }>;
  title: string;
  useConsoleUrl: SharePluginStart['url']['locators']['useUrl'];
}

export const ExportDiscoverSessionJsonFlyout = ({
  canShowDevTools,
  closeFlyout,
  getExportJson,
  sanitizeExportJson,
  title,
  useConsoleUrl,
}: ExportDiscoverSessionJsonFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'discoverExportJsonFlyoutTitle' });
  const [exportCurrentTab, setExportCurrentTab] = useState(false);
  const getSelectedExportJson = useCallback(
    () => getExportJson(exportCurrentTab),
    [exportCurrentTab, getExportJson]
  );

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="discoverExportJsonFlyout"
      maxWidth={1000}
      onClose={closeFlyout}
      ownFocus
      session="start"
      size="m"
    >
      <ExportJsonFlyoutContent<DiscoverSessionSanitizeRequest, DiscoverSessionApiData>
        closeFlyout={closeFlyout}
        dataTestSubjPrefix="discover"
        downloadExportJson={(filename, content) =>
          downloadFileAs(filename, { content, type: 'application/json' })
        }
        getExportJson={getSelectedExportJson}
        headerActions={
          <EuiSwitch
            compressed
            checked={exportCurrentTab}
            data-test-subj="discoverExportJsonCurrentTabSwitch"
            label={i18n.translate('discover.exportJson.exportCurrentTabToggleSwitch', {
              defaultMessage: 'Export only the current tab',
            })}
            onChange={(event) => setExportCurrentTab(event.target.checked)}
          />
        }
        isTechnicalPreview
        objectType={i18n.translate('discover.exportJson.objectTypeLabel', {
          defaultMessage: 'Discover Session',
        })}
        openInConsole={{
          canShow: canShowDevTools,
          // TODO: Remove `apiVersion` when the Discover session API access becomes `public`.
          getRequest: (jsonValue) =>
            `POST kbn:${DISCOVER_SESSION_API_BASE_PATH}?apiVersion=${DISCOVER_SESSION_API_VERSION}\n${jsonValue}`,
          useUrl: useConsoleUrl,
        }}
        prepareExportJson={sanitizeExportJson}
        title={title}
        titleId={titleId}
      />
    </EuiFlyout>
  );
};
