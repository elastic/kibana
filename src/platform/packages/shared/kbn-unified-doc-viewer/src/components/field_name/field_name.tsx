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
  euiFontSize,
  type UseEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FieldIcon, FieldIconProps } from '@kbn/react-field';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query';
import { getFieldTypeName } from '@kbn/field-utils';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface Props {
  fieldName: string;
  displayNameOverride?: string;
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
  displayNameOverride,
  scripted = false,
  highlight = '',
}: Props) {
  // const styles = useMemoCss(componentStyles);

  const typeName = getFieldTypeName(fieldType);
  const fieldMappingDisplayName = fieldMapping?.displayName ? fieldMapping.displayName : fieldName;
  const fieldDisplayName = displayNameOverride ?? fieldMappingDisplayName;

  const tooltip = fieldDisplayName !== fieldName ? `${fieldDisplayName} (${fieldName})` : fieldName;
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
          // css={styles.fieldIconContainer}
        >
          <EuiFlexItem grow={false}>
            <FieldIcon type={fieldType!} label={typeName} scripted={scripted} {...fieldIconProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center" direction="row" wrap>
          <EuiFlexItem
            className="kbnDocViewer__fieldName eui-textBreakAll"
            // css={styles.fieldName}
            grow={false}
            data-test-subj={`tableDocViewRow-${fieldName}-name`}
          >
            <EuiToolTip
              position="top"
              content={tooltip}
              delay="long"
              anchorClassName="eui-textBreakAll"
            >
              <EuiHighlight search={highlight}>{fieldDisplayName}</EuiHighlight>
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
                // css={styles.multiFieldBadge}
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

const componentStyles = {
  fieldIconContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingTop: `calc(${euiTheme.size.xs} * 1.5)`,
      lineHeight: euiTheme.font.lineHeightMultiplier,
    }),
  fieldName: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');

    return css({
      padding: euiTheme.size.xs,
      paddingLeft: 0,
      lineHeight: euiTheme.font.lineHeightMultiplier,

      '.euiDataGridRowCell__popover &': {
        fontSize,
      },
    });
  },
  multiFieldBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: `${euiTheme.size.xs} 0`,
      fontWeight: euiTheme.font.weight.regular,
      fontFamily: euiTheme.font.family,
    }),
};
