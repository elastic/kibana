/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { genai } from '@elastic/eui-illustrations';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ConnectLlmPanelProps {
  onConnect: () => void;
  docsHref: string;
}

/** Takes the prompt's place on the landing when no LLM connector is set up. */
export const ConnectLlmPanel = ({ onConnect, docsHref }: ConnectLlmPanelProps) => (
  <EuiPanel hasBorder paddingSize="l" data-test-subj="agenticFirstConnectLlmPanel">
    <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIllustration type={genai} alt="" css={{ width: 64, height: 64 }} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="workflows.agenticFirst.connectLlm.title"
              defaultMessage="Connect an LLM to build with AI"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="workflows.agenticFirst.connectLlm.description"
              defaultMessage="Describe the automation. AI writes the workflow."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiButtonEmpty
            size="s"
            href={docsHref}
            target="_blank"
            iconType="external"
            iconSide="right"
            data-test-subj="agenticFirstConnectLlmDocsLink"
          >
            <FormattedMessage
              id="workflows.agenticFirst.connectLlm.docsLink"
              defaultMessage="Read the docs"
            />
          </EuiButtonEmpty>
          <EuiButton
            size="s"
            fill
            onClick={onConnect}
            data-test-subj="agenticFirstConnectLlmButton"
          >
            <FormattedMessage
              id="workflows.agenticFirst.connectLlm.connectButton"
              defaultMessage="Connect LLM"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
