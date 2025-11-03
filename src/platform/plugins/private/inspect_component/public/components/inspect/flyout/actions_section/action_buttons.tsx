/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

interface ActionLink {
  /** The URL for the link. */
  href: string;
  /** The internationalization ID for the link label. */
  i18nId: string;
  /** EUI icon type for the link component. */
  icon: string;
  /** Unique id. */
  id: string;
  /** Visible text for the link. */
  label: string;
}

interface Props {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  relativePath: string;
  branch: string;
}

export const ActionButtons = ({
  fileName,
  lineNumber,
  columnNumber,
  relativePath,
  branch,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const CURSOR_LINK = `cursor://file/${fileName}:${lineNumber}:${columnNumber}`;
  const GITHUB_DEV_LINK = `https://github.dev/elastic/kibana/blob/${branch}/${relativePath}#L${lineNumber}`;
  const GITHUB_LINK = `https://github.com/elastic/kibana/blob/${branch}/${relativePath}#L${lineNumber}`;
  const VSCODE_LINK = `vscode://file/${fileName}:${lineNumber}:${columnNumber}`;
  const WEBSTORM_LINK = `webstorm://open?file=/${fileName}&line=${lineNumber}&column=${columnNumber}`;

  const ACTIONS: ActionLink[] = [
    {
      href: GITHUB_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.actionsSection.openOnGitHubButtonText',
      icon: 'logoGithub',
      id: 'github',
      label: 'GitHub',
    },
    {
      href: GITHUB_DEV_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.actionsSection.openOnGitHubDevButtonText',
      icon: 'logoGithub',
      id: 'githubDev',
      label: 'GitHub.dev',
    },
    {
      href: VSCODE_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.actionsSection.openInVSCodeButtonText',
      icon: 'code',
      id: 'vscode',
      label: 'VSCode',
    },
    {
      i18nId: 'kbnInspectComponent.inspectFlyout.actionsSection.openInWebStormButtonText',
      href: WEBSTORM_LINK,
      icon: 'code',
      id: 'webstorm',
      label: 'WebStorm',
    },
    {
      href: CURSOR_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.actionsSection.openInCursorButtonText',
      icon: 'code',
      id: 'cursor',
      label: 'Cursor',
    },
  ];

  const iconCss = css`
    margin-block-end: ${euiTheme.size.s};
  `;

  const titleCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <EuiFlexGroup gutterSize="m" wrap={true} data-test-subj="inspectComponentActionButtons">
      {ACTIONS.map(({ href, icon, id, i18nId, label }, index) => {
        const isLastOdd = index === ACTIONS.length - 1 && ACTIONS.length % 2 !== 0;

        const cardCss = css({
          [`@media (min-width: ${euiTheme.breakpoint.m}px)`]: {
            flex: `0 1 calc(50% - ${euiTheme.size.m})`,
            maxWidth: `calc(50% - ${euiTheme.size.m})`,
            ...(isLastOdd && {
              marginLeft: 'auto',
              marginRight: 'auto',
            }),
          },
        });

        const ariaLabel = i18n.translate(
          'kbnInspectComponent.inspectFlyout.actionsSection.openFileInAriaLabel',
          {
            defaultMessage: 'Open file using {target}',
            values: { target: label },
          }
        );

        return (
          <EuiCard
            data-test-subj={`inspectComponentActionButton-${id}`}
            key={id}
            aria-label={ariaLabel}
            href={href}
            css={cardCss}
            layout="vertical"
            icon={<EuiIcon type={icon} size="xxl" css={iconCss} />}
            title={
              <EuiText color={euiTheme.colors.textPrimary} component="span" css={titleCss}>
                <FormattedMessage id={i18nId} defaultMessage={label} />
              </EuiText>
            }
            titleSize="s"
            target="_blank"
          />
        );
      })}
    </EuiFlexGroup>
  );
};
