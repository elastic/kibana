/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ComponentData } from '../../types';

interface Props {
  componentData: ComponentData;
}

export const LinksSection = ({ componentData }: Props) => {
  if (!componentData) return null;

  const { fileName, lineNumber, columnNumber, relativePath } = componentData;

  const CURSOR_LINK = `cursor://file/${fileName}:${lineNumber}:${columnNumber}`;
  const GITHUB_LINK = `https://github.com/elastic/kibana/blob/main/${relativePath}#L${lineNumber}`;
  const GITHUB_DEV_LINK = `https://github.dev/elastic/kibana/blob/main/${relativePath}#L${lineNumber}`;
  const VSCODE_LINK = `vscode://file/${fileName}:${lineNumber}:${columnNumber}`;
  const WEBSTORM_LINK = `webstorm://open?file=/${fileName}&line=${lineNumber}&column=${columnNumber}`;

  return (
    <EuiFlexItem grow={false}>
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="kbnInspectComponent.inspectFlyout.linksSection.title"
              defaultMessage="Links"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton href={GITHUB_LINK} target="_blank" size="s" iconType="logoGithub" fill>
              <FormattedMessage
                id="kbnInspectComponent.inspectFlyout.linksSection.openOnGitHubButtonText"
                defaultMessage="Open on GitHub"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton href={GITHUB_DEV_LINK} target="_blank" size="s" iconType="logoGithub">
              <FormattedMessage
                id="kbnInspectComponent.inspectFlyout.linksSection.openOnGitHubVSCodeButtonText"
                defaultMessage="Open on GitHub.dev"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton href={VSCODE_LINK} target="_blank" size="s" iconType="code" fill>
              <FormattedMessage
                id="kbnInspectComponent.inspectFlyout.linksSection.openInVSCodeButtonText"
                defaultMessage="Open in VSCode"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton href={WEBSTORM_LINK} target="_blank" size="s" iconType="code">
              <FormattedMessage
                id="kbnInspectComponent.inspectFlyout.linksSection.openInWebStormButtonText"
                defaultMessage="Open in WebStorm"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton href={CURSOR_LINK} target="_blank" size="s" iconType="code">
              <FormattedMessage
                id="kbnInspectComponent.inspectFlyout.linksSection.openInCursorButtonText"
                defaultMessage="Open in Cursor"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};
