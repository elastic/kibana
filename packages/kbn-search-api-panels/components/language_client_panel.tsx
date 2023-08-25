/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import type { HttpStart } from '@kbn/core-http-browser';

import { LanguageDefinition } from '../types';
import './select_client.scss';

interface SelectClientProps {
  language: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  isSelectedLanguage: boolean;
  http: HttpStart;
  pluginId?: string;
  src?: string;
}

export const LanguageClientPanel: React.FC<SelectClientProps> = ({
  language,
  setSelectedLanguage,
  isSelectedLanguage,
  http,
  pluginId,
  src,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="xs" direction="row">
      <EuiFlexItem>
        <EuiPanel
          hasBorder
          borderRadius="m"
          className={
            isSelectedLanguage
              ? 'serverlessSearchSelectClientPanelSelectedBorder'
              : 'serverlessSearchSelectClientPanelBorder'
          }
          onClick={() => setSelectedLanguage(language)}
          color={isSelectedLanguage ? 'primary' : 'plain'}
        >
          <EuiFlexGroup direction="column" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiImage
                alt=""
                src={
                  src || http.basePath.prepend(`/plugins/${pluginId}/assets/${language.iconType}`)
                }
                height={euiTheme.size.xl}
                width={euiTheme.size.xl}
              />
              <EuiSpacer size="s" />
              <EuiText textAlign="center" color={isSelectedLanguage ? 'default' : 'subdued'}>
                <h5>{language.name}</h5>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
