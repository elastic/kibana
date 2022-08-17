/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  euiPaletteColorBlind,
  EuiProgress,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export interface FieldTopValuesBucketProps {
  type?: 'normal' | 'other';
  formattedLabel?: string;
  formattedValue: string;
  progressValue: number;
  testSubject: string;
}

export const FieldTopValuesBucket: React.FC<FieldTopValuesBucketProps> = ({
  type = 'normal',
  formattedLabel,
  formattedValue,
  progressValue,
  testSubject,
}) => {
  const euiVisColorPalette = euiPaletteColorBlind();
  const euiColorVis1 = euiVisColorPalette[1];

  return (
    <EuiFlexGroup alignItems="stretch" gutterSize="s" responsive={false}>
      <EuiFlexItem
        grow={1}
        css={css`
          min-width: 0;
        `}
      >
        <EuiFlexGroup alignItems="stretch" gutterSize="s" responsive={false}>
          <EuiFlexItem
            grow={true}
            className="eui-textTruncate"
            data-test-subj={`${testSubject}-topValues-formattedLabel`}
          >
            {!formattedLabel ? (
              <EuiText size="xs">
                {type === 'other'
                  ? i18n.translate('unifiedFieldList.fieldStats.otherDocsLabel', {
                      defaultMessage: 'Other',
                    })
                  : formattedValue === '' && (
                      <em>
                        {i18n.translate('unifiedFieldList.fieldStats.emptyStringValueLabel', {
                          defaultMessage: 'Empty string',
                        })}
                      </em>
                    )}
              </EuiText>
            ) : (
              <EuiToolTip content={formattedLabel} delay="long">
                <EuiText size="xs" className="eui-textTruncate" color="subdued">
                  {formattedLabel}
                </EuiText>
              </EuiToolTip>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj={`${testSubject}-topValues-formattedValue`}>
            <EuiText size="xs" textAlign="left" color={euiColorVis1}>
              {formattedValue}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiProgress
          value={progressValue}
          max={1}
          size="s"
          color={type === 'other' ? 'subdued' : euiColorVis1}
          aria-label={`${formattedLabel} (${formattedValue})`}
        />
      </EuiFlexItem>
      {/* TODO: add filter button */}
    </EuiFlexGroup>
  );
};
