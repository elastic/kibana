/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiLink, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';

import { i18n } from '@kbn/i18n';
import { compressToEncodedURIComponent } from 'lz-string';

const RUN_IN_CONSOLE = i18n.translate('tryInConsole.button.text', {
  defaultMessage: 'Run in Console',
});

export interface TryInConsoleButtonProps {
  request?: string;
  application?: ApplicationStart;
  consolePlugin?: ConsolePluginStart;
  sharePlugin?: SharePluginStart;
  content?: string | React.ReactElement;
  showIcon?: boolean;
  type?: 'link' | 'button' | 'emptyButton';
  telemetryId?: string;
  onClick?: () => void;
}
export const TryInConsoleButton = ({
  request,
  application,
  consolePlugin,
  sharePlugin,
  content = RUN_IN_CONSOLE,
  showIcon = true,
  type = 'emptyButton',
  telemetryId,
  onClick: onClickProp,
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
    onClickProp?.();
  };

  const getAriaLabel = () => {
    if (
      consolePlugin?.openEmbeddedConsole !== undefined &&
      consolePlugin?.isEmbeddedConsoleAvailable?.()
    ) {
      return i18n.translate('tryInConsole.embeddedConsoleButton.ariaLabel', {
        defaultMessage: 'Run in Console  - opens in embedded console',
      });
    }
    return i18n.translate('tryInConsole.inNewTab.button.ariaLabel', {
      defaultMessage: 'Run in Console  - opens in a new tab',
    });
  };

  const commonProps = {
    'data-test-subj': type === 'link' ? 'tryInConsoleLink' : 'tryInConsoleButton',
    'aria-label': getAriaLabel(),
    'data-telemetry-id': telemetryId,
    onClick,
  };
  const iconType = showIcon ? 'play' : undefined;

  switch (type) {
    case 'link':
      return <EuiLink {...commonProps}>{content}</EuiLink>;
    case 'button':
      return (
        <EuiButton color="primary" iconType={iconType} size="s" {...commonProps}>
          {content}
        </EuiButton>
      );
    case 'emptyButton':
    default:
      return (
        <EuiButtonEmpty iconType={iconType} size="s" {...commonProps}>
          {content}
        </EuiButtonEmpty>
      );
  }
};
