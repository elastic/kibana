/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiCard,
  EuiIcon,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
  copyToClipboard,
  EuiFlexGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { ActionLink, ComponentData } from '../../types';

interface Props {
  componentData: ComponentData;
}

export const LinksSection = ({ componentData }: Props) => {
  const [isTextCopied, setTextCopied] = useState(false);
  const { euiTheme } = useEuiTheme();

  if (!componentData) return null;

  const { columnNumber, fileName, lineNumber, relativePath, baseFileName } = componentData;

  const CURSOR_LINK = `cursor://file/${fileName}:${lineNumber}:${columnNumber}`;
  const GITHUB_DEV_LINK = `https://github.dev/elastic/kibana/blob/main/${relativePath}#L${lineNumber}`;
  const GITHUB_LINK = `https://github.com/elastic/kibana/blob/main/${relativePath}#L${lineNumber}`;
  const VSCODE_LINK = `vscode://file/${fileName}:${lineNumber}:${columnNumber}`;
  const WEBSTORM_LINK = `webstorm://open?file=/${fileName}&line=${lineNumber}&column=${columnNumber}`;

  const ACTIONS: ActionLink[] = [
    {
      href: GITHUB_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.linksSection.openOnGitHubButtonText',
      icon: 'logoGithub',
      id: 'github',
      label: 'GitHub',
    },
    {
      href: GITHUB_DEV_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.linksSection.openOnGitHubDevButtonText',
      icon: 'logoGithub',
      id: 'githubDev',
      label: 'GitHub.dev',
    },
    {
      href: VSCODE_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.linksSection.openInVSCodeButtonText',
      icon: 'code',
      id: 'vscode',
      label: 'VSCode',
    },
    {
      i18nId: 'kbnInspectComponent.inspectFlyout.linksSection.openInWebStormButtonText',
      href: WEBSTORM_LINK,
      icon: 'code',
      id: 'webstorm',
      label: 'WebStorm',
    },
    {
      href: CURSOR_LINK,
      i18nId: 'kbnInspectComponent.inspectFlyout.linksSection.openInCursorButtonText',
      icon: 'code',
      id: 'cursor',
      label: 'Cursor',
    },
  ];

  const styles = css({
    '.linksGrid': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: euiTheme.size.m,
    },

    '.linkCard': {
      textAlign: 'center',

      '.euiCard__title': {
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.bold,
      },

      '.euiIcon': {
        marginBlockEnd: euiTheme.size.s,
      },
    },

    '.linksGrid .linkCard': {
      flex: '1 1 100%',
      maxWidth: '100%',
    },

    [`@media (min-width: ${euiTheme.breakpoint.m}px)`]: {
      '.linksGrid .linkCard': {
        flex: `0 1 calc(50% - ${euiTheme.size.m})`,
        maxWidth: `calc(50% - ${euiTheme.size.m})`,
      },

      '.linksGrid .linkCard:last-child:nth-child(odd)': {
        marginLeft: 'auto',
        marginRight: 'auto',
      },
    },
  });

  const onClick = () => {
    copyToClipboard(relativePath);
    setTextCopied(true);
  };

  const onBlur = () => {
    setTextCopied(false);
  };

  return (
    <EuiFlexItem css={styles} grow={false}>
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="kbnInspectComponent.inspectFlyout.linksSection.title"
              defaultMessage="Actions"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiText size="s">
            <FormattedMessage
              id="kbnInspectComponent.inspectFlyout.linksSection.subtitle"
              defaultMessage="Open {baseFileName}"
              values={{
                baseFileName: (
                  <EuiText
                    size="s"
                    component="span"
                    css={css`
                      font-weight: ${euiTheme.font.weight.bold};
                    `}
                  >
                    {baseFileName}
                  </EuiText>
                ),
              }}
            />
          </EuiText>
          <EuiToolTip
            content={
              isTextCopied
                ? i18n.translate(
                    'kbnInspectComponent.inspectFlyout.linksSection.copyRelativeFilePathCopiedTooltip',
                    { defaultMessage: 'Relative file path copied' }
                  )
                : i18n.translate(
                    'kbnInspectComponent.inspectFlyout.linksSection.copyRelativeFilePathActionTooltip',
                    { defaultMessage: 'Copy relative file path' }
                  )
            }
          >
            <EuiButtonIcon
              aria-label={i18n.translate(
                'kbnInspectComponent.inspectFlyout.linksSection.copyFileNameAriaLabel',
                {
                  defaultMessage: 'Copy file name',
                }
              )}
              color="text"
              iconType="copy"
              onClick={onClick}
              onBlur={onBlur}
            />
          </EuiToolTip>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <div className="linksGrid">
          {ACTIONS.map(({ href, icon, id, i18nId, label }) => {
            const ariaLabel = i18n.translate(
              'kbnInspectComponent.inspectFlyout.linksSection.openFileInAriaLabel',
              {
                defaultMessage: 'Open file using {target}',
                values: { target: label },
              }
            );

            return (
              <EuiCard
                aria-label={ariaLabel}
                className="linkCard"
                href={href}
                icon={<EuiIcon type={icon} size="xxl" />}
                key={id}
                layout="vertical"
                title={
                  <EuiText color={euiTheme.colors.textPrimary}>
                    <FormattedMessage id={i18nId} defaultMessage={label} />
                  </EuiText>
                }
                titleSize="s"
                target="'_blank'"
              />
            );
          })}
        </div>
      </EuiPanel>
    </EuiFlexItem>
  );
};
