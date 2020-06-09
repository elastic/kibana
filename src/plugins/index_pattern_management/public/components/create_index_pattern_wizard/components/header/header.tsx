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

import React from 'react';

import {
  EuiBetaBadge,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiSwitch,
  EuiLink,
  EuiCode,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DocLinksSetup } from 'kibana/public';
import { useKibana } from '../../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../../types';

export const Header = ({
  prompt,
  indexPatternName,
  showSystemIndices = false,
  isIncludingSystemIndices,
  onChangeIncludingSystemIndices,
  isBeta = false,
  docLinks,
}: {
  prompt?: React.ReactNode;
  indexPatternName: string;
  showSystemIndices?: boolean;
  isIncludingSystemIndices: boolean;
  onChangeIncludingSystemIndices: () => void;
  isBeta?: boolean;
  docLinks: DocLinksSetup;
}) => {
  const changeTitle = useKibana<IndexPatternManagmentContext>().services.chrome.docTitle.change;
  const createIndexPatternHeader = i18n.translate(
    'indexPatternManagement.createIndexPatternHeader',
    {
      defaultMessage: 'Create {indexPatternName}',
      values: { indexPatternName },
    }
  );

  changeTitle(createIndexPatternHeader);

  return (
    <div>
      <EuiTitle>
        <h1>
          {createIndexPatternHeader}
          {isBeta ? (
            <>
              {' '}
              <EuiBetaBadge
                label={i18n.translate('indexPatternManagement.createIndexPattern.betaLabel', {
                  defaultMessage: 'Beta',
                })}
              />
            </>
          ) : null}
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.description"
            defaultMessage="An index pattern can match a single index, for example, {single}, or {multiple} indices, {star}."
            values={{
              multiple: <strong>multiple</strong>,
              single: <EuiCode>filebeat-4-3-22</EuiCode>,
              star: <EuiCode>filebeat-*</EuiCode>,
            }}
          />
          <br />
          <EuiLink href={docLinks.links.indexPatterns.introduction} target="_blank" external>
            <FormattedMessage
              id="indexPatternManagement.createIndexPattern.documentation"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </p>
      </EuiText>
      {showSystemIndices ? (
        <>
          <EuiSpacer />
          <EuiSwitch
            label={
              <FormattedMessage
                id="indexPatternManagement.createIndexPattern.includeSystemIndicesToggleSwitchLabel"
                defaultMessage="Include system indices"
              />
            }
            id="checkboxShowSystemIndices"
            checked={isIncludingSystemIndices}
            onChange={onChangeIncludingSystemIndices}
          />
        </>
      ) : null}

      {prompt ? (
        <>
          <EuiSpacer size="m" />
          {prompt}
        </>
      ) : null}
    </div>
  );
};
