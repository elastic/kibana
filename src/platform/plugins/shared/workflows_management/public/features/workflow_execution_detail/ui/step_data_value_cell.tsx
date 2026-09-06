/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

/** Values longer than this never use a hover tooltip — click-to-expand instead. */
export const VALUE_TOOLTIP_MAX_CHARS = 120;

interface StepDataValueCellProps {
  value: string;
}

/**
 * Value cell for Input/Output/Error tables. Short values may tooltip; long
 * values expand inline on click (no giant hover tooltip).
 */
export const StepDataValueCell = React.memo<StepDataValueCellProps>(({ value }) => {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > VALUE_TOOLTIP_MAX_CHARS;

  if (!isLong) {
    if (!value) {
      return <span css={{ fontSize: '12px', color: euiTheme.colors.subduedText }}>{'—'}</span>;
    }
    return (
      <EuiToolTip content={value} display="block" position="top">
        <span
          tabIndex={0}
          css={{
            display: 'block',
            width: '100%',
            fontSize: '12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </span>
      </EuiToolTip>
    );
  }

  if (expanded) {
    return (
      <div data-test-subj="workflowExecutionStepDataValueExpanded">
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          justifyContent="flexEnd"
          responsive={false}
          css={{ marginBottom: euiTheme.size.xs }}
        >
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={value}>
              {(copy) => {
                const copyLabel = i18n.translate('workflows.executionFlyout.stepDetail.copyValue', {
                  defaultMessage: 'Copy value',
                });
                return (
                  <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="copy"
                      size="xs"
                      color="text"
                      aria-label={copyLabel}
                      onClick={copy}
                      data-test-subj="workflowExecutionStepDataValueCopy"
                    />
                  </EuiToolTip>
                );
              }}
            </EuiCopy>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('workflows.executionFlyout.stepDetail.collapseValue', {
                defaultMessage: 'Collapse value',
              })}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="minimize"
                size="xs"
                color="text"
                aria-label={i18n.translate('workflows.executionFlyout.stepDetail.collapseValue', {
                  defaultMessage: 'Collapse value',
                })}
                onClick={() => setExpanded(false)}
                data-test-subj="workflowExecutionStepDataValueCollapse"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiCodeBlock
          language="text"
          fontSize="s"
          paddingSize="s"
          transparentBackground
          overflowHeight={240}
          css={{
            fontFamily: euiTheme.font.familyCode,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {value}
        </EuiCodeBlock>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      data-test-subj="workflowExecutionStepDataValueExpand"
      aria-label={i18n.translate('workflows.executionFlyout.stepDetail.expandValue', {
        defaultMessage: 'Expand value',
      })}
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.xs,
        width: '100%',
        minWidth: 0,
        padding: 0,
        margin: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
      }}
    >
      <span
        css={{
          flex: 1,
          minWidth: 0,
          fontSize: '12px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
      <EuiIcon
        type="maximize"
        size="s"
        color="subdued"
        css={{ flexShrink: 0 }}
        aria-hidden={true}
      />
    </button>
  );
});

StepDataValueCell.displayName = 'StepDataValueCell';
