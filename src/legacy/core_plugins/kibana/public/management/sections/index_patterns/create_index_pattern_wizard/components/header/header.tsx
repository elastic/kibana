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
import { getDocLink } from 'ui/documentation_links';

import {
  EuiBetaBadge,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiSwitch,
  EuiCode,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  prompt?: React.ReactNode;
  indexPatternName: string;
  showSystemIndices?: boolean;
  isIncludingSystemIndices: boolean;
  onChangeIncludingSystemIndices: () => void;
  isBeta?: boolean;
}

export const Header: React.FunctionComponent<Props> = ({
  prompt,
  indexPatternName,
  showSystemIndices = false,
  isIncludingSystemIndices,
  onChangeIncludingSystemIndices,
  isBeta = false,
}) => {
  return (
    <div>
      <EuiTitle>
        <h1>
          <FormattedMessage
            id="kbn.management.createIndexPatternHeader"
            defaultMessage="Create {indexPatternName}"
            values={{
              indexPatternName,
            }}
          />
          {isBeta ? (
            <Fragment>
              {' '}
              <EuiBetaBadge
                label={i18n.translate('kbn.management.createIndexPattern.betaLabel', {
                  defaultMessage: 'Beta',
                })}
              />
            </Fragment>
          ) : null}
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          <FormattedMessage
            id="kbn.management.createIndexPatternLabel"
            defaultMessage="An index pattern can match a single index, for example, {single}, or {multiple} indices, {star}."
            values={{
              multiple: <strong>multiple</strong>,
              single: <EuiCode>filebeat-4-3-22</EuiCode>,
              star: <EuiCode>filebeat-*</EuiCode>,
            }}
          />

          <br />
          <EuiLink href={getDocLink('indexPatterns.introduction')} target="_blank" external>
            <FormattedMessage
              id="kbn.management.indexPatternPrompt.documentation"
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
                id="kbn.management.createIndexPattern.includeSystemIndicesToggleSwitchLabel"
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
        <Fragment>
          <EuiSpacer size="m" />
          {prompt}
        </Fragment>
      ) : null}
    </div>
  );
};
