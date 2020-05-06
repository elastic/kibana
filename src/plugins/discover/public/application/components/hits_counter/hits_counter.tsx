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
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { formatNumWithCommas } from '../../helpers';

export interface HitsCounterProps {
  /**
   * the number of query hits
   */
  hits: number;
  /**
   * displays the reset button
   */
  showResetButton: boolean;
  /**
   * resets the query
   */
  onResetQuery: () => void;
}

export function HitsCounter({ hits, showResetButton, onResetQuery }: HitsCounterProps) {
  return (
    <I18nProvider>
      <EuiFlexGroup
        gutterSize="s"
        className="dscResultCount"
        responsive={false}
        justifyContent="center"
        alignItems="center"
      >
        <EuiFlexItem grow={false} component="span" data-test-subj="discoverQueryHits">
          <strong>{formatNumWithCommas(hits)}</strong>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="discover.hitsPluralTitle"
            defaultMessage="{hits, plural, one {hit} other {hits}}"
            values={{
              hits,
            }}
          />
        </EuiFlexItem>
        {showResetButton && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="resetSavedSearch" onClick={onResetQuery} size="s">
              <FormattedMessage
                id="discover.reloadSavedSearchButton"
                defaultMessage="Reset search"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </I18nProvider>
  );
}
