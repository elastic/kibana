/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiLink, EuiButton, EuiButtonEmpty, EuiContextMenuItem } from '@elastic/eui';
import { css } from '@emotion/react';
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
  iconType?: string;
  type?: 'link' | 'button' | 'emptyButton' | 'contextMenuItem';
  telemetryId?: string;
  onClick?: () => void;
  'data-test-subj'?: string;
}
export const TryInConsoleButton = ({
  request,
  application,
  consolePlugin,
  sharePlugin,
  content = RUN_IN_CONSOLE,
  showIcon = true,
  iconType = 'console',
  type = 'emptyButton',
  telemetryId,
  onClick: onClickProp,
  'data-test-subj': dataTestSubj,
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
    'data-test-subj': dataTestSubj
      ? dataTestSubj
      : type === 'link'
      ? 'tryInConsoleLink'
      : type === 'contextMenuItem'
      ? 'tryInConsoleContextMenuItem'
      : 'tryInConsoleButton',
    'aria-label': getAriaLabel(),
    'data-telemetry-id': telemetryId,
    onClick,
  };
  const btnIconType = showIcon ? iconType : undefined;

  const noPadding = css({
    padding: 0,
  });

  switch (type) {
    case 'link':
      return <EuiLink {...commonProps}>{content}</EuiLink>;
    case 'button':
      return (
        <EuiButton color="primary" iconType={btnIconType} size="s" {...commonProps}>
          {content}
        </EuiButton>
      );
    case 'contextMenuItem':
      return (
        <EuiContextMenuItem icon={iconType} hasPanel={false} css={noPadding} {...commonProps}>
          {content}
        </EuiContextMenuItem>
      );
    case 'emptyButton':
    default:
      return (
        <EuiButtonEmpty iconType={btnIconType} size="s" {...commonProps}>
          {content}
        </EuiButtonEmpty>
      );
  }
};
