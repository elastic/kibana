/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
