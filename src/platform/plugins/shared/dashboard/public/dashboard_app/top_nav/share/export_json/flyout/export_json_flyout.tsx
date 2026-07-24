/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compressToEncodedURIComponent } from 'lz-string';
import React, { useMemo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  ExportJsonFlyout as SharedExportJsonFlyout,
  type ExportJsonFlyoutProps,
  type SharePluginStart,
} from '@kbn/share-plugin/public';
import { i18n } from '@kbn/i18n';
import { coreServices, shareService } from '../../../../../services/kibana_services';

type NoSanitizedState = void & {};

type DashboardExportJsonFlyoutProps<State extends object, SanitizedState extends object> = Omit<
  ExportJsonFlyoutProps<State, SanitizedState>,
  'isTechnicalPreview' | 'renderAdditionalActions'
> & {
  apiPath?: string;
};

// Split in two components on purpose: `useUrl` is a React hook, so it has to run on every render of
// whichever component calls it. Keeping the checks here turns "should we show the button?" into a
// mount/unmount decision instead of a conditional hook call, and it means the JSON is never
// compressed for users who cannot open Console.
const OpenInConsoleButton = ({ apiPath, jsonValue }: { apiPath: string; jsonValue: string }) => {
  const share = shareService;

  if (!coreServices.application?.capabilities?.dev_tools?.show || !share) {
    return null;
  }

  return <OpenInConsoleLink apiPath={apiPath} jsonValue={jsonValue} share={share} />;
};

const OpenInConsoleLink = ({
  apiPath,
  jsonValue,
  share,
}: {
  apiPath: string;
  jsonValue: string;
  share: SharePluginStart;
}) => {
  const devToolsDataUri = useMemo(
    () => compressToEncodedURIComponent(`POST kbn:${apiPath}\n${jsonValue}`),
    [apiPath, jsonValue]
  );
  const consoleHref = share.url.locators.useUrl(
    () => ({
      id: 'CONSOLE_APP_LOCATOR',
      params: {
        loadFrom: `data:text/plain,${devToolsDataUri}`,
      },
    }),
    [devToolsDataUri]
  );

  if (!consoleHref) {
    return null;
  }

  return (
    <EuiButtonEmpty
      size="xs"
      flush="right"
      iconType="wrench"
      href={consoleHref}
      target="_blank"
      rel="noopener noreferrer"
      data-test-subj="exportJsonOpenInConsoleButton"
    >
      {i18n.translate('dashboard.exportJson.openInConsoleButtonLabel', {
        defaultMessage: 'Open in Console',
      })}
    </EuiButtonEmpty>
  );
};

export const ExportJsonFlyout = <
  State extends object,
  SanitizedState extends object = NoSanitizedState
>({
  apiPath,
  ...props
}: DashboardExportJsonFlyoutProps<State, SanitizedState>) => (
  <SharedExportJsonFlyout
    {...props}
    isTechnicalPreview
    renderAdditionalActions={
      apiPath
        ? (jsonValue) => <OpenInConsoleButton apiPath={apiPath} jsonValue={jsonValue} />
        : undefined
    }
  />
);
