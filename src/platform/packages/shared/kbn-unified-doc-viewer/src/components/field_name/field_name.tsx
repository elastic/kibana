/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiHighlight,
  UseEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FieldIcon, FieldIconProps } from '@kbn/react-field';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query';
import { getFieldTypeName } from '@kbn/field-utils';

interface Props {
  fieldName: string;
  fieldType?: string;
  fieldMapping?: DataViewField;
  fieldIconProps?: Omit<FieldIconProps, 'type'>;
  scripted?: boolean;
  highlight?: string;
}

export function FieldName({
  fieldName,
  fieldMapping,
  fieldType,
  fieldIconProps,
  scripted = false,
  highlight = '',
}: Props) {
  const typeName = getFieldTypeName(fieldType);
  const displayName =
    fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : fieldName;
  const tooltip = displayName !== fieldName ? `${displayName} (${fieldName})` : fieldName;
  const subTypeMulti = fieldMapping && getDataViewFieldSubtypeMulti(fieldMapping.spec);
  const isMultiField = !!subTypeMulti?.multi;

  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          responsive={false}
          alignItems="center"
          direction="row"
          wrap={false}
          css={fieldIconContainerCss}
        >
          <EuiFlexItem grow={false}>
            <FieldIcon type={fieldType!} label={typeName} scripted={scripted} {...fieldIconProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center" direction="row" wrap>
          <EuiFlexItem
            className="kbnDocViewer__fieldName eui-textBreakAll" // kbnDocViewer__fieldName is used in tests
            css={fieldNameCss}
            grow={false}
            data-test-subj={`tableDocViewRow-${fieldName}-name`}
          >
            <EuiToolTip
              position="top"
              content={tooltip}
              delay="long"
              anchorClassName="eui-textBreakAll"
            >
              <EuiHighlight search={highlight}>{displayName}</EuiHighlight>
            </EuiToolTip>
          </EuiFlexItem>

          {isMultiField && (
            <EuiToolTip
              position="top"
              delay="long"
              content={i18n.translate(
                'unifiedDocViewer.fieldChooser.discoverField.multiFieldTooltipContent',
                {
                  defaultMessage: 'Multi-fields can have multiple values per field',
                }
              )}
            >
              <EuiBadge
                title=""
                css={multiFieldBadgeCss}
                color="default"
                data-test-subj={`tableDocViewRow-${fieldName}-multifieldBadge`}
              >
                <FormattedMessage
                  id="unifiedDocViewer.fieldChooser.discoverField.multiField"
                  defaultMessage="multi-field"
                />
              </EuiBadge>
            </EuiToolTip>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const fieldIconContainerCss = ({ euiTheme }: UseEuiTheme) => css`
  padding-top: calc(${euiTheme.size.xs} * 1.5);
  line-height: ${euiTheme.size.base};
`;

const fieldNameCss = ({ euiTheme }: UseEuiTheme) => css`
  padding: ${euiTheme.size.xs};
  padding-left: 0;
  line-height: ${euiTheme.font.lineHeightMultiplier};
`;

const multiFieldBadgeCss = ({ euiTheme }: UseEuiTheme) => css`
  margin: ${euiTheme.size.xs} 0;
  font-weight: ${euiTheme.font.weight.regular};
  font-family: ${euiTheme.font.family};
`;
