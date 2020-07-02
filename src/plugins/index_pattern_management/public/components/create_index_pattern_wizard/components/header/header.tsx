/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment } from 'react';

import {
  EuiBetaBadge,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiSwitch,
  EuiSwitchEvent,
  EuiIcon,
  EuiHorizontalRule,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../../types';

export const Header = ({
  prompt,
  indexPatternName,
  showSystemIndices = false,
  isIncludingSystemIndices,
  onChangeIncludingSystemIndices,
  isBeta = false,
}: {
  prompt?: React.ReactNode;
  indexPatternName: string;
  showSystemIndices?: boolean;
  isIncludingSystemIndices: boolean;
  onChangeIncludingSystemIndices: (event: EuiSwitchEvent) => void;
  isBeta?: boolean;
}) => {
  const changeTitle = useKibana<IndexPatternManagmentContext>().services.chrome.docTitle.change;
  const createIndexPatternHeader = i18n.translate(
    'indexPatternManagement.createIndexPatternHeader',
    {
      defaultMessage: 'Create {indexPatternName}',
      values: { indexPatternName },
    }
  );

  const createIndexPatternLabel = i18n.translate('indexPatternManagement.createIndexPatternLabel', {
    defaultMessage:
      'An index pattern can match a single source, for example, filebeat-4-3-22, or multiple data sources, filebeat-*. {docsLink}',
    values: {
      docsLink:
        '<a href="https://www.elastic.co/guide/en/kibana/current/tutorial-define-index.html" target="_blank" rel="noopener noreferrer">' +
        i18n.translate('indexPatternManagement.indexPatternDocLink', {
          defaultMessage: 'Read documentation',
        }) +
        '</a>',
    },
  });

  changeTitle(createIndexPatternHeader);

  return (
    <div>
      <EuiTitle>
        <h1>
          {createIndexPatternHeader}
          {isBeta ? (
            <Fragment>
              {' '}
              <EuiBetaBadge
                label={i18n.translate('indexPatternManagement.createIndexPattern.betaLabel', {
                  defaultMessage: 'Beta',
                })}
              />
            </Fragment>
          ) : null}
        </h1>
      </EuiTitle>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <EuiTextColor
              color="subdued"
              dangerouslySetInnerHTML={{ __html: createIndexPatternLabel }}
            />
            <EuiIcon type="popout" size="s" />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showSystemIndices ? (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.includeSystemAAndHiddenIndicesToggleSwitchLabel"
                  defaultMessage="Include system and hidden indices"
                />
              }
              id="checkboxShowSystemIndices"
              checked={isIncludingSystemIndices}
              onChange={onChangeIncludingSystemIndices}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {prompt ? (
        <Fragment>
          <EuiSpacer size="s" />
          {prompt}
        </Fragment>
      ) : null}
      <EuiHorizontalRule />
    </div>
  );
};
