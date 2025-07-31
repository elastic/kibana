/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiBadge,
  EuiTextColor,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import { useFieldPreviewContext } from '../field_preview_context';
import { IsUpdatingIndicator } from '../is_updating_indicator';
import { ImagePreviewModal } from '../image_preview_modal';
import type { DocumentField } from './field_list';
import { PreviewState } from '../types';
import { useStateSelector } from '../../../state_utils';
import { ITEM_HEIGHT } from './constants';

export interface PreviewListItemProps {
  field: DocumentField;
  toggleIsPinned?: (
    name: string,
    keyboardEvent: { isKeyboardEvent: boolean; buttonId: string }
  ) => void;
  hasScriptError?: boolean;
  /** Indicates whether the field list item comes from the Painless script */
  isFromScript?: boolean;
}

const isLoadingPreviewSelector = (state: PreviewState) => state.isLoadingPreview;

export const PreviewListItem: React.FC<PreviewListItemProps> = ({
  field: { key, value, formattedValue, isPinned = false },
  toggleIsPinned,
  hasScriptError,
  isFromScript = false,
}) => {
  const styles = useMemoCss(componentStyles);

  const pinButtonId = `fieldPreview.pinFieldButtonLabel.${key}`;

  const { controller } = useFieldPreviewContext();
  const isLoadingPreview = useStateSelector(controller.state$, isLoadingPreviewSelector);

  const [isPreviewImageModalVisible, setIsPreviewImageModalVisible] = useState(false);

  const [isPinHovered, setIsPinHovered] = useState(false);
  const [isPinFocused, setIsPinFocused] = useState(false);

  const showPinIcon = isPinHovered || isPinFocused || isPinned;

  const doesContainImage = formattedValue?.includes('<img');

  const renderName = () => {
    if (isFromScript && !Boolean(key)) {
      return (
        <span css={styles.lightWeight}>
          <EuiTextColor color="subdued">
            {i18n.translate('indexPatternFieldEditor.fieldPreview.fieldNameNotSetLabel', {
              defaultMessage: 'Field name not set',
            })}
          </EuiTextColor>
        </span>
      );
    }

    return key;
  };

  const withTooltip = (content: JSX.Element) => (
    <EuiToolTip position="top" content={typeof value !== 'string' ? JSON.stringify(value) : value}>
      {content}
    </EuiToolTip>
  );

  const renderValue = () => {
    if (isFromScript && isLoadingPreview) {
      return (
        <span css={styles.lightWeight}>
          <IsUpdatingIndicator />
        </span>
      );
    }

    if (hasScriptError) {
      return (
        <div>
          <EuiBadge iconType="warning" color="danger" data-test-subj="scriptErrorBadge">
            {i18n.translate('indexPatternFieldEditor.fieldPreview.scriptErrorBadgeLabel', {
              defaultMessage: 'Script error',
            })}
          </EuiBadge>
        </div>
      );
    }

    if (isFromScript && value === undefined) {
      return (
        <span css={styles.lightWeight}>
          <EuiTextColor color="subdued">
            {i18n.translate('indexPatternFieldEditor.fieldPreview.valueNotSetLabel', {
              defaultMessage: 'Value not set',
            })}
          </EuiTextColor>
        </span>
      );
    }

    if (doesContainImage) {
      return (
        <EuiButtonEmpty
          color="text"
          onClick={() => setIsPreviewImageModalVisible(true)}
          iconType="image"
        >
          {i18n.translate('indexPatternFieldEditor.fieldPreview.viewImageButtonLabel', {
            defaultMessage: 'View image',
          })}
        </EuiButtonEmpty>
      );
    }

    if (formattedValue !== undefined) {
      return withTooltip(
        <span
          css={styles.keyAndValueWrapper}
          // We  can dangerously set HTML here because this content is guaranteed to have been run through a valid field formatter first.
          dangerouslySetInnerHTML={{ __html: formattedValue! }} // eslint-disable-line react/no-danger
        />
      );
    }

    return withTooltip(<span css={styles.keyAndValueWrapper}>{JSON.stringify(value)}</span>);
  };

  return (
    <>
      <EuiFlexGroup
        css={[styles.listItem, isFromScript ? styles.highlightedRow : undefined]}
        gutterSize="none"
        data-test-subj="listItem"
        onMouseEnter={() => setIsPinHovered(true)}
        onMouseLeave={() => setIsPinHovered(false)}
      >
        <EuiFlexItem css={styles.keyAndValue}>
          <div css={styles.keyAndValueWrapper} data-test-subj="key">
            {renderName()}
          </div>
        </EuiFlexItem>
        <EuiFlexItem css={styles.keyAndValue} data-test-subj="value">
          {renderValue()}
        </EuiFlexItem>

        <EuiFlexItem css={styles.actions} grow={false}>
          {toggleIsPinned && (
            <EuiButtonIcon
              onClick={(e: { detail: number }) => {
                const isKeyboardEvent = e.detail === 0; // Mouse = non-zero, Keyboard = 0
                toggleIsPinned(key, { isKeyboardEvent, buttonId: pinButtonId });
              }}
              id={pinButtonId}
              onFocus={() => setIsPinFocused(true)}
              onBlur={() => setIsPinFocused(false)}
              color="text"
              iconType={showPinIcon ? 'pinFilled' : 'empty'}
              data-test-subj="pinFieldButton"
              aria-label={i18n.translate(
                'indexPatternFieldEditor.fieldPreview.pinFieldButtonLabel',
                {
                  defaultMessage: 'Pin field',
                }
              )}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {isPreviewImageModalVisible && (
        <ImagePreviewModal
          imgHTML={formattedValue!}
          closeModal={() => setIsPreviewImageModalVisible(false)}
        />
      )}
    </>
  );
};

const componentStyles = {
  listItem: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderBottom: euiTheme.border.thin,
      height: ITEM_HEIGHT,
      alignItems: 'center',
      overflow: 'hidden',
    }),
  highlightedRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePrimary,
      fontWeight: euiTheme.font.weight.bold,
    }),
  lightWeight: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: euiTheme.font.weight.regular,
    }),
  keyAndValueWrapper: css({
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    width: '100%',
  }),
  keyAndValue: css({
    overflow: 'hidden',

    '& .euiToolTipAnchor': {
      width: '100%', // We need the tooltip <span /> to be 100% to display the text ellipsis of the field value
    },
  }),
  actions: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexBasis: `${euiTheme.size.l} !important`,
    }),
};
