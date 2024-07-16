/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonEmpty, EuiLink } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';

import { i18n } from '@kbn/i18n';
import { compressToEncodedURIComponent } from 'lz-string';

const TRY_IN_CONSOLE = i18n.translate('tryInConsole.button', { defaultMessage: 'Try in Console' });

export interface TryInConsoleButtonProps {
  request?: string;
  application?: ApplicationStart;
  consolePlugin?: ConsolePluginStart;
  sharePlugin?: SharePluginStart;
  content?: string | React.ReactElement;
  showIcon?: boolean;
  link?: boolean;
}
export const TryInConsoleButton = ({
  request,
  application,
  consolePlugin,
  sharePlugin,
  content,
  showIcon = true,
  link = false,
}: TryInConsoleButtonProps) => {
  const url = sharePlugin?.url;
  const canShowDevtools = !!application?.capabilities?.dev_tools?.show;
  if (!canShowDevtools || !url) return null;

  const devToolsDataUri = request ? compressToEncodedURIComponent(request) : null;
  const consolePreviewLink = url.locators.get('CONSOLE_APP_LOCATOR')?.useUrl(
    devToolsDataUri
      ? {
          loadFrom: `data:text/plain,${devToolsDataUri}`,
        }
      : {},
    undefined,
    [request]
  );
  if (!consolePreviewLink) return null;

  const onClick = () => {
    const embeddedConsoleAvailable =
      (consolePlugin?.openEmbeddedConsole !== undefined &&
        consolePlugin?.isEmbeddedConsoleAvailable?.()) ??
      false;
    if (embeddedConsoleAvailable) {
      consolePlugin!.openEmbeddedConsole!(request);
    } else {
      window.open(consolePreviewLink, '_blank', 'noreferrer');
    }
  };

  if (link) {
    return (
      <EuiLink data-test-subj="tryInConsoleLink" onClick={onClick}>
        {content ?? TRY_IN_CONSOLE}
      </EuiLink>
    );
  }

  const getAriaLabel = () => {
    if (
      consolePlugin?.openEmbeddedConsole !== undefined &&
      consolePlugin?.isEmbeddedConsoleAvailable?.()
    ) {
      return i18n.translate('tryInConsole.embeddedConsoleButton', {
        defaultMessage: 'Try the snipped in the Console - opens in embedded console',
      });
    }
    return i18n.translate('tryInConsole.inNewTab.button', {
      defaultMessage: 'Try the below snippet in Console - opens in a new tab',
    });
  };

  return (
    <EuiButtonEmpty
      data-test-subj="tryInConsoleButton"
      onClick={onClick}
      iconType={showIcon ? 'popout' : undefined}
      size="s"
      aria-label={getAriaLabel()}
    >
      {content ?? TRY_IN_CONSOLE}
    </EuiButtonEmpty>
  );
};
