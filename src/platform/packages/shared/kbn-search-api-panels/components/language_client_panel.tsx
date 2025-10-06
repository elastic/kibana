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
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import type { LanguageDefinition } from '../types';
import * as Styles from './styles';

interface SelectClientProps {
  language: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  isSelectedLanguage: boolean;
  assetBasePath?: string;
  src?: string;
}

export const LanguageClientPanel: React.FC<SelectClientProps> = ({
  language,
  setSelectedLanguage,
  isSelectedLanguage,
  assetBasePath,
  src,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="xs" direction="row">
      <EuiFlexItem>
        <EuiPanel
          hasBorder
          borderRadius="m"
          css={
            isSelectedLanguage
              ? Styles.searchSelectClientPanelSelectedBorder(euiTheme)
              : Styles.searchSelectClientPanelBorder(euiTheme)
          }
          onClick={() => setSelectedLanguage(language)}
          color={isSelectedLanguage ? 'primary' : 'plain'}
        >
          <EuiFlexGroup direction="column" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiImage
                alt=""
                src={src || `${assetBasePath}/${language.iconType}`}
                height={euiTheme.size.xl}
                width={euiTheme.size.xl}
              />
              <EuiSpacer size="s" />
              <EuiText
                size="relative"
                textAlign="center"
                color={isSelectedLanguage ? 'default' : 'subdued'}
              >
                <strong>{language.name}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
