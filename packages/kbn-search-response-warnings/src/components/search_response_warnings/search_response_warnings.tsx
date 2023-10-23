/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PropsWithChildren, useEffect, useState } from 'react';
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
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ViewWarningButton } from '../view_warning_button';
import type { SearchResponseWarning } from '../../types';

/**
 * SearchResponseWarnings component props
 */
export interface SearchResponseWarningsProps {
  /**
   * An array of warnings
   */
  interceptedWarnings?: SearchResponseWarning[];

  /**
   * View variant
   */
  variant: 'callout' | 'badge' | 'empty_prompt';

  /**
   * Custom data-test-subj value
   */
  'data-test-subj': string;
}

/**
 * SearchResponseWarnings component
 * @param interceptedWarnings
 * @param variant
 * @param dataTestSubj
 * @constructor
 */
export const SearchResponseWarnings = ({
  interceptedWarnings,
  variant,
  'data-test-subj': dataTestSubj,
}: SearchResponseWarningsProps) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const [isCalloutVisibleMap, setIsCalloutVisibleMap] = useState<Record<number, boolean>>({});
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsCalloutVisibleMap({});
  }, [interceptedWarnings, setIsCalloutVisibleMap]);

  if (!interceptedWarnings?.length) {
    return null;
  }

  if (variant === 'callout') {
    return (
      <div>
        <ul
          className="eui-yScroll"
          css={css`
            max-height: calc(${euiTheme.size.base} * 10);
            overflow: auto;
            list-style: none;
          `}
        >
          {interceptedWarnings.map((warning, index) => {
            if (isCalloutVisibleMap[index] === false) {
              return null;
            }
            return (
              <li key={`warning-${index}`}>
                <EuiCallOut
                  title={
                    <CalloutTitleWrapper
                      onCloseCallout={() =>
                        setIsCalloutVisibleMap((prev) => ({ ...prev, [index]: false }))
                      }
                    >
                      <WarningContent
                        warning={warning}
                        groupStyles={{ alignItems: 'center', direction: 'row' }}
                        data-test-subj={dataTestSubj}
                      />
                    </CalloutTitleWrapper>
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
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (variant === 'empty_prompt') {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="warning"
        title={
          <h2>
            {i18n.translate('searchResponseWarnings.noResultsTitle', {
              defaultMessage: 'No results found',
            })}
          </h2>
        }
        body={
          <ul
            className="eui-yScrollWithShadows"
            css={css`
              max-height: 50vh;
              overflow: auto;
              list-style: none !important;
              margin: 0 !important;
              padding: 0 0 ${euiTheme.size.xs} 0 !important;
              text-align: left;
            `}
          >
            {interceptedWarnings.map((warning, index) => (
              <li
                key={`warning-${index}`}
                css={css`
                  padding: 0;
                  & + & {
                    margin-top: ${euiTheme.size.l};
                  }
                `}
              >
                <WarningContent
                  warning={warning}
                  textSize="m"
                  groupStyles={{ direction: 'column' }}
                  data-test-subj={dataTestSubj}
                />
              </li>
            ))}
          </ul>
        }
      />
    );
  }

  if (variant === 'badge') {
    const warningCount = interceptedWarnings.length;
    const buttonLabel = i18n.translate('searchResponseWarnings.badgeButtonLabel', {
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
        <ul
          className="eui-yScrollWithShadows"
          css={css`
            max-height: calc(${euiTheme.size.base} * 20);
            width: calc(${euiTheme.size.base} * 16);
          `}
        >
          {interceptedWarnings.map((warning, index) => (
            <li
              key={`warning-${index}`}
              data-test-subj={`${dataTestSubj}_item`}
              css={css`
                padding: ${euiTheme.size.base};

                & + & {
                  border-top: ${euiTheme.border.thin};
                }
              `}
            >
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="warning" color="warning" />
                </EuiFlexItem>
                <EuiFlexItem
                  css={css`
                    overflow-wrap: break-word;
                    min-width: 0;
                  `}
                >
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
  warning,
  textSize = 's',
  groupStyles,
  'data-test-subj': dataTestSubj,
}: {
  warning: SearchResponseWarning;
  textSize?: EuiTextProps['size'];
  groupStyles?: Partial<EuiFlexGroupProps>;
  'data-test-subj': string;
}) {
  return (
    <EuiFlexGroup gutterSize="xs" {...groupStyles} wrap>
      <EuiFlexItem grow={false}>
        <EuiText size={textSize} data-test-subj={`${dataTestSubj}_warningTitle`}>
          {warning.message}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ViewWarningButton
          color="primary"
          size="s"
          onClick={warning.openInInspector}
          isButtonEmpty={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function CalloutTitleWrapper({
  children,
  onCloseCallout,
}: PropsWithChildren<{ onCloseCallout: () => void }>) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={i18n.translate('searchResponseWarnings.closeButtonAriaLabel', {
            defaultMessage: 'Close',
          })}
          onClick={onCloseCallout}
          type="button"
          iconType="cross"
          color="warning"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
