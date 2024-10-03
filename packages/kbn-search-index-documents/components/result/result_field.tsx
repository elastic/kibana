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
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiToken,
} from '@elastic/eui';

import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { ResultFieldProps } from './result_types';

const iconMap: Record<string, string> = {
  boolean: 'tokenBoolean',
  date: 'tokenDate',
  date_range: 'tokenDate',
  dense_vector: 'tokenVectorDense',
  double: 'tokenNumber',
  double_range: 'tokenDate',
  flattened: 'tokenObject',
  float: 'tokenNumber',
  float_range: 'tokenNumber',
  geo_point: 'tokenGeo',
  geo_shape: 'tokenGeo',
  half_float: 'tokenNumber',
  histogram: 'tokenHistogram',
  integer: 'tokenNumber',
  integer_range: 'tokenNumber',
  ip: 'tokenIp',
  ip_range: 'tokenIp',
  join: 'tokenJoin',
  keyword: 'tokenKeyword',
  long: 'tokenNumber',
  long_range: 'tokenNumber',
  nested: 'tokenObject',
  object: 'tokenObject',
  percolator: 'tokenPercolator',
  rank_feature: 'tokenRankFeature',
  rank_features: 'tokenRankFeatures',
  scaled_float: 'tokenNumber',
  search_as_you_type: 'tokenSearchType',
  semantic_text: 'tokenSemanticText',
  shape: 'tokenShape',
  short: 'tokenNumber',
  sparse_vector: 'tokenVectorSparse',
  text: 'tokenString',
  token_count: 'tokenTokenCount',
  unsigned_long: 'tokenNumber',
};
const defaultToken = 'questionInCircle';

const ResultValue: React.FC<{ fieldValue: string; fieldType?: string; isExpanded?: boolean }> = ({
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
  } else if (fieldType === 'dense_vector') {
    return (
      <>
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiText size="s">{fieldValue}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div className={!isExpanded ? 'denseVectorFieldValue' : ''}>
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  } else {
    return <EuiText size="s">{fieldValue}</EuiText>;
  }
};

export const ResultField: React.FC<ResultFieldProps> = ({
  iconType,
  fieldName,
  fieldValue,
  fieldType,
  isExpanded,
}) => {
  return (
    <EuiTableRow className="resultField">
      <EuiTableRowCell className="resultFieldRowCell" width={euiThemeVars.euiSizeL} valign="middle">
        <span>
          <EuiToken
            className="resultField__token"
            iconType={iconType || (fieldType ? iconMap[fieldType] : defaultToken)}
          />
        </span>
      </EuiTableRowCell>
      <EuiTableRowCell
        className="resultFieldRowCell"
        width="20%"
        truncateText={!isExpanded}
        valign="middle"
      >
        <EuiText size="s">{fieldName}</EuiText>
      </EuiTableRowCell>
      <EuiTableRowCell className="resultFieldRowCell" truncateText={!isExpanded} valign="middle">
        <ResultValue fieldValue={fieldValue} fieldType={fieldType} isExpanded={isExpanded} />
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
