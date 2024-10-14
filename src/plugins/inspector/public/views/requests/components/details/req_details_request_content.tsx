/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import React, { useCallback, ReactNode } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { compressToEncodedURIComponent } from 'lz-string';
import type { ConnectionRequestParams } from '@elastic/transport';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { RequestCodeViewer } from './req_code_viewer';
import type { InspectorKibanaServices } from '../types';

const openInConsoleLabel = i18n.translate('inspector.requests.openInConsoleLabel', {
  defaultMessage: 'Open in Console',
});

const openInSearchProfilerLabel = i18n.translate('inspector.requests.openInSearchProfilerLabel', {
  defaultMessage: 'Open in Search Profiler',
});

interface RequestDetailsRequestContentProps {
  indexPattern?: string;
  requestParams?: ConnectionRequestParams;
  json: string;
}

export const RequestDetailsRequestContent: React.FC<RequestDetailsRequestContentProps> = ({
  requestParams,
  indexPattern,
  json,
}) => {
  const { services } = useKibana<InspectorKibanaServices>();

  function getValue(): string {
    if (!requestParams) {
      return json;
    }

    const fullPath = requestParams.querystring
      ? `${requestParams.path}?${requestParams.querystring}`
      : requestParams.path;

    return `${requestParams.method} ${fullPath}\n${json}`;
  }

  const value = getValue();

  const navigateToUrl = services.application?.navigateToUrl;

  // "Open in Console" button
  const devToolsDataUri = compressToEncodedURIComponent(value);
  const consoleHref = services.share.url.locators
    .get('CONSOLE_APP_LOCATOR')
    ?.useUrl({ loadFrom: `data:text/plain,${devToolsDataUri}` });
  // Check if both the Dev Tools UI and the Console UI are enabled.
  const canShowDevTools =
    services.application?.capabilities?.dev_tools.show && consoleHref !== undefined;
  const shouldShowDevToolsLink = !!(requestParams && canShowDevTools);
  const handleDevToolsLinkClick = useCallback(
    () => consoleHref && navigateToUrl && navigateToUrl(consoleHref),
    [consoleHref, navigateToUrl]
  );

  // "Open in Search Profiler" button
  const searchProfilerDataUri = compressToEncodedURIComponent(json);
  const searchProfilerHref = services.share.url.locators
    .get('SEARCH_PROFILER_LOCATOR')
    ?.useUrl({ index: indexPattern, loadFrom: `data:text/plain,${searchProfilerDataUri}` });
  // Check if both the Dev Tools UI and the SearchProfiler UI are enabled.
  const canShowsearchProfiler =
    services.application?.capabilities?.dev_tools.show && searchProfilerHref !== undefined;
  const shouldShowSearchProfilerLink = !!(indexPattern && canShowsearchProfiler);
  const handleSearchProfilerLinkClick = useCallback(
    () => searchProfilerHref && navigateToUrl && navigateToUrl(searchProfilerHref),
    [searchProfilerHref, navigateToUrl]
  );

  const actions: Array<{ name: string; action: ReactNode }> = [];

  if (shouldShowDevToolsLink) {
    actions.push({
      name: 'openInConsole',
      action: (
        <EuiButtonEmpty
          size="xs"
          flush="right"
          iconType="wrench"
          href={consoleHref}
          onClick={handleDevToolsLinkClick}
          data-test-subj="inspectorRequestOpenInConsoleButton"
        >
          {openInConsoleLabel}
        </EuiButtonEmpty>
      ),
    });
  }

  if (shouldShowSearchProfilerLink) {
    actions.push({
      name: 'openInSearchProfiler',
      action: (
        <EuiButtonEmpty
          size="xs"
          flush="right"
          iconType="visBarHorizontal"
          href={searchProfilerHref}
          onClick={handleSearchProfilerLinkClick}
          data-test-subj="inspectorRequestOpenInSearchProfilerButton"
        >
          {openInSearchProfilerLabel}
        </EuiButtonEmpty>
      ),
    });
  }

  return <RequestCodeViewer value={value} actions={actions} />;
};
