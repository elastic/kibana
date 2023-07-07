/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiText,
  EuiTextProps,
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiToolTip,
  EuiButton,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { SearchResponseInterceptedWarning } from '../../../types';
import './warnings_callout.scss';

export interface WarningsCalloutProps {
  interceptedWarnings?: SearchResponseInterceptedWarning[];
  variant: 'inline' | 'badge' | 'empty_prompt';
  'data-test-subj': string;
}

export const WarningsCallout = ({
  interceptedWarnings,
  variant,
  'data-test-subj': dataTestSubj,
}: WarningsCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  if (!interceptedWarnings?.length) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <>
        {interceptedWarnings.map((warning, index) => (
          <EuiCallOut
            key={`warning-${index}`}
            title={
              <WarningContent
                warning={warning}
                groupStyles={{ alignItems: 'center', direction: 'row' }}
                data-test-subj={dataTestSubj}
              />
            }
            color="warning"
            iconType="warning"
            size="s"
            css={css`
              .euiTitle {
                display: flex;
                align-items: center;
              }
            `}
            data-test-subj={dataTestSubj}
          />
        ))}
      </>
    );
  }

  if (variant === 'empty_prompt') {
    return (
      <EuiEmptyPrompt
        color="warning"
        title={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" color="warning" size="l" />
            </EuiFlexItem>
            <EuiFlexItem>
              <h2>
                {i18n.translate('discover.warningsCallout.noResultsTitle', {
                  defaultMessage: 'No results found',
                })}
              </h2>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        body={
          <p>
            {interceptedWarnings.map((warning, index) => (
              <WarningContent
                key={`warning-${index}`}
                warning={warning}
                textSize="m"
                groupStyles={{ direction: 'column' }}
                data-test-subj={dataTestSubj}
              />
            ))}
          </p>
        }
        css={css`
          text-align: left;
        `}
      />
    );
  }

  if (variant === 'badge') {
    const warningCount = interceptedWarnings.length;
    const buttonLabel = i18n.translate('discover.warningsCallout.badgeButtonLabel', {
      defaultMessage: '{warningCount} {warningCount, plural, one {warning} other {warnings}}',
      values: {
        warningCount,
      },
    });

    return (
      <EuiPopover
        panelPaddingSize="none"
        button={
          <EuiToolTip content={buttonLabel}>
            <EuiButton
              minWidth={0}
              size="s"
              color="warning"
              onClick={() => setIsPopoverOpen(true)}
              data-test-subj={`${dataTestSubj}_trigger`}
              title={buttonLabel}
              css={css`
                block-size: ${euiTheme.size.l};
                font-size: ${xsFontSize};
                padding: 0 ${euiTheme.size.xs};
                & > * {
                  gap: ${euiTheme.size.xs};
                }
              `}
            >
              <EuiIcon
                type="warning"
                css={css`
                  margin-left: ${euiTheme.size.xxs};
                `}
              />
              {warningCount}
            </EuiButton>
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
      >
        <ul className="dscWarningsCalloutWarningList">
          {interceptedWarnings.map((warning, index) => (
            <li
              key={`warning-${index}`}
              data-test-subj={`${dataTestSubj}_item`}
              className="dscWarningsCalloutWarningList__item"
            >
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="warning" color="warning" />
                </EuiFlexItem>
                <EuiFlexItem className="dscWarningsCalloutWarningList__itemDescription">
                  <WarningContent
                    warning={warning}
                    groupStyles={{ direction: 'column' }}
                    data-test-subj={dataTestSubj}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </li>
          ))}
        </ul>
      </EuiPopover>
    );
  }

  return null;
};

function WarningContent({
  warning: { originalWarning, action },
  textSize = 's',
  groupStyles,
  'data-test-subj': dataTestSubj,
}: {
  warning: SearchResponseInterceptedWarning;
  textSize?: EuiTextProps['size'];
  groupStyles?: Partial<EuiFlexGroupProps>;
  'data-test-subj': string;
}) {
  return (
    <EuiFlexGroup gutterSize="xs" {...groupStyles}>
      <EuiFlexItem grow={false}>
        <EuiText size={textSize} data-test-subj={`${dataTestSubj}_warningTitle`}>
          <strong>{originalWarning.message}</strong>
        </EuiText>
      </EuiFlexItem>
      {'text' in originalWarning ? (
        <EuiFlexItem grow={false}>
          <EuiText size={textSize} data-test-subj={`${dataTestSubj}_warningMessage`}>
            <p>{originalWarning.text}</p>
          </EuiText>
        </EuiFlexItem>
      ) : null}
      {action ? <EuiFlexItem grow={false}>{action}</EuiFlexItem> : null}
    </EuiFlexGroup>
  );
}
