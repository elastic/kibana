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
  EuiBadge,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { PERMANENTLY_TRUNCATED_FIELDS } from './constants';

interface ResultFieldValueProps {
  fieldValue: string;
  fieldType: string;
  isExpanded?: boolean;
}

export const ResultFieldValue: React.FC<ResultFieldValueProps> = ({
  fieldValue,
  fieldType,
  isExpanded = false,
}) => {
  if (
    isExpanded &&
    fieldType &&
    (['object', 'array', 'nested'].includes(fieldType) || Array.isArray(fieldValue))
  ) {
    return (
      <EuiCodeBlock language="json" transparentBackground fontSize="s">
        {fieldValue}
      </EuiCodeBlock>
    );
  } else if (PERMANENTLY_TRUNCATED_FIELDS.includes(fieldType)) {
    return (
      <>
        <EuiText size="s" color="default">
          {fieldValue}
        </EuiText>
        {fieldType === 'dense_vector' && (
          <div className={'denseVectorFieldValue'}>
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
              <EuiFlexItem>
                <EuiBadge color="hollow">
                  {i18n.translate('searchIndexDocuments.result.value.denseVector.dimLabel', {
                    defaultMessage: '{value} dims',
                    values: {
                      value: JSON.parse(fieldValue).length,
                    },
                  })}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCopy textToCopy={fieldValue}>
                  {(copy) => (
                    <EuiIcon
                      type="copyClipboard"
                      onClick={copy}
                      data-test-subj="copyDenseVector"
                      aria-label={i18n.translate(
                        'searchIndexDocuments.result.value.denseVector.copy',
                        {
                          defaultMessage: 'Copy vector',
                        }
                      )}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </>
    );
  } else {
    return (
      <EuiText size="s" color="default">
        {fieldValue}
      </EuiText>
    );
  }
};
