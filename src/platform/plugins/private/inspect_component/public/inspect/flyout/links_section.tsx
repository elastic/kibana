/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ComponentData } from '../../types';

interface Props {
  componentData: ComponentData;
}

export const LinksSection = ({ componentData }: Props) => {
  if (!componentData) return null;

  const { fileName, lineNumber, columnNumber, relativePath } = componentData;

  const GITHUB_LINK = `https://github.com/elastic/kibana/blob/main/${relativePath}#L${lineNumber}`;
  const VSCODE_LINK = `vscode://file/${fileName}:${lineNumber}:${columnNumber}`;

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
            <EuiButtonEmpty href={GITHUB_LINK} target="_blank" size="s" flush="left">
              <FormattedMessage
                id="kbnInspectComponent.inspectFlyout.linksSection.openOnGitHubButtonText"
                defaultMessage="Open on GitHub"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={VSCODE_LINK}
              target="_blank"
              size="s"
              iconType="code"
              flush="left"
            >
              <FormattedMessage
                id="kbnInspectComponent.inspectFlyout.linksSection.openInVSCodeButtonText"
                defaultMessage="Open in VSCode"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};
