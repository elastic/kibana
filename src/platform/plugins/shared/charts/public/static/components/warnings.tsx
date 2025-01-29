/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';

export function Warnings({
  warnings,
  compressed = false,
  'data-test-subj': dataTestSubj = 'chart-inline-warning-button',
}: {
  warnings: React.ReactNode[];
  compressed?: boolean;
  'data-test-subj'?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const [open, setOpen] = useState(false);
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const onWarningButtonClick = useCallback(() => {
    setOpen(!open);
  }, [open]);

  if (warnings.length === 0) return null;

  return (
    <>
      <EuiPopover
        isOpen={open}
        panelPaddingSize="none"
        closePopover={() => setOpen(false)}
        button={
          compressed ? (
            <EuiButton
              color="warning"
              css={css`
                block-size: ${euiTheme.size.l};
                border-radius: 0 ${euiTheme.border.radius.medium} 0 ${euiTheme.border.radius.small};
                font-size: ${xsFontSize};
                padding: 0 ${euiTheme.size.xs};
                & > * {
                  gap: ${euiTheme.size.xs};
                }
              `}
              iconSize="s"
              iconType="warning"
              minWidth={0}
              onClick={onWarningButtonClick}
              size="s"
              data-test-subj={dataTestSubj}
            >
              {warnings.length}
            </EuiButton>
          ) : (
            <EuiButtonEmpty
              color="warning"
              iconType="warning"
              onClick={onWarningButtonClick}
              size="xs"
              data-test-subj={dataTestSubj}
            >
              {i18n.translate('charts.warning.warningLabel', {
                defaultMessage:
                  '{numberWarnings, number} {numberWarnings, plural, one {warning} other {warnings}}',
                values: {
                  numberWarnings: warnings.length,
                },
              })}
            </EuiButtonEmpty>
          )
        }
      >
        <div css={{ maxWidth: 512 }}>
          {warnings.map((w, i) => (
            <React.Fragment key={i}>
              <div
                css={{
                  padding: euiTheme.size.s,
                }}
                data-test-subj="chart-inline-warning"
              >
                <EuiText size="s">{w}</EuiText>
              </div>
              {i < warnings.length - 1 && <EuiHorizontalRule margin="none" />}
            </React.Fragment>
          ))}
        </div>
      </EuiPopover>
    </>
  );
}
