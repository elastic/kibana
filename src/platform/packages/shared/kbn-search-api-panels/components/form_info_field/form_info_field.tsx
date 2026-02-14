/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const COPIED_ICON_DISPLAY_DURATION_MS = 1000;

interface FormInfoFieldProps {
  actions?: React.ReactNode[];
  label?: string;
  value: string;
  copyValue?: string;
  dataTestSubj?: string;
  copyValueDataTestSubj?: string;
  maxWidth?: number;
  minWidth?: number;
}

export const FormInfoField: React.FC<FormInfoFieldProps> = ({
  actions = [],
  label,
  value,
  copyValue,
  dataTestSubj,
  copyValueDataTestSubj,
  maxWidth,
  minWidth,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback((copyFn: () => void) => {
    copyFn();
    setIsCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, COPIED_ICON_DISPLAY_DURATION_MS);
  }, []);

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      css={css({
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
        minWidth: minWidth ? `${minWidth}px` : undefined,
      })}
    >
      {label && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <span>{label}</span>
          </EuiTitle>
        </EuiFlexItem>
      )}
      <EuiFlexGroup
        css={css({
          color: euiTheme.colors.textParagraph,
          borderRadius: `${euiTheme.border.radius.medium}`,
          backgroundColor: `${euiTheme.colors.backgroundBaseSubdued}`,
          maxWidth: 'fit-content',
        })}
        alignItems="center"
        gutterSize="xs"
        responsive={false}
      >
        <EuiFlexItem css={{ minWidth: 0, maxWidth: `${euiTheme.base * 18.75}px` }} grow={false}>
          <code
            data-test-subj={dataTestSubj}
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              fontSize: euiTheme.size.m,
              padding: `${euiTheme.size.s} ${euiTheme.size.s}`,
            }}
          >
            {value}
          </code>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy
            textToCopy={copyValue ?? value}
            afterMessage={i18n.translate('searchApiPanels.formInfoField.copyAfterMessage', {
              defaultMessage: 'Copied',
            })}
          >
            {(copy) => (
              <EuiButtonIcon
                size="s"
                display="empty"
                onClick={() => handleCopy(copy)}
                iconType={isCopied ? 'check' : 'copy'}
                color={isCopied ? 'success' : 'text'}
                data-test-subj={
                  isCopied && copyValueDataTestSubj
                    ? `${copyValueDataTestSubj}-copied`
                    : copyValueDataTestSubj
                }
                aria-label={
                  isCopied
                    ? i18n.translate('searchApiPanels.formInfoField.copiedAriaLabel', {
                        defaultMessage: 'Copied',
                      })
                    : i18n.translate('searchApiPanels.formInfoField.copyAriaLabel', {
                        defaultMessage: 'Copy to clipboard',
                      })
                }
              />
            )}
          </EuiCopy>
        </EuiFlexItem>
        {actions.map((action, index) => (
          <EuiFlexItem key={index} grow={false}>
            {action}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
