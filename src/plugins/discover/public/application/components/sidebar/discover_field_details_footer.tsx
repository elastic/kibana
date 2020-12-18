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
import { EuiLink, EuiPopoverFooter, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { IndexPatternField } from '../../../../../data/common/index_patterns/fields';
import { IndexPattern } from '../../../../../data/common/index_patterns/index_patterns';
import { FieldDetails } from './types';

interface DiscoverFieldDetailsFooterProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  details: FieldDetails;
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
}

export function DiscoverFieldDetailsFooter({
  field,
  indexPattern,
  details,
  onAddFilter,
}: DiscoverFieldDetailsFooterProps) {
  return (
    <EuiPopoverFooter>
      <EuiText size="xs" textAlign="center">
        {!indexPattern.metaFields.includes(field.name) && !field.scripted ? (
          <EuiLink
            onClick={() => onAddFilter('_exists_', field.name, '+')}
            data-test-subj="onAddFilterButton"
          >
            <FormattedMessage
              id="discover.fieldChooser.detailViews.existsInRecordsText"
              defaultMessage="Exists in {value} / {totalValue} records"
              values={{
                value: details.exists,
                totalValue: details.total,
              }}
            />
          </EuiLink>
        ) : (
          <FormattedMessage
            id="discover.fieldChooser.detailViews.valueOfRecordsText"
            defaultMessage="{value} / {totalValue} records"
            values={{
              value: details.exists,
              totalValue: details.total,
            }}
          />
        )}
      </EuiText>
    </EuiPopoverFooter>
  );
}
