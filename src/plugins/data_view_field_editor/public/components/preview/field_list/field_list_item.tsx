/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import classnames from 'classnames';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiBadge,
  EuiTextColor,
} from '@elastic/eui';

import { useFieldPreviewContext } from '../field_preview_context';
import { IsUpdatingIndicator } from '../is_updating_indicator';
import { ImagePreviewModal } from '../image_preview_modal';
import type { DocumentField } from './field_list';

interface Props {
  field: DocumentField;
  toggleIsPinned?: (name: string) => void;
  hasScriptError?: boolean;
  /** Indicates whether the field list item comes from the Painless script */
  isFromScript?: boolean;
}

export const PreviewListItem: React.FC<Props> = ({
  field: { key, value, formattedValue, isPinned = false },
  toggleIsPinned,
  hasScriptError,
  isFromScript = false,
}) => {
  const { isLoadingPreview } = useFieldPreviewContext();

  const [isPreviewImageModalVisible, setIsPreviewImageModalVisible] = useState(false);

  /* eslint-disable @typescript-eslint/naming-convention */
  const classes = classnames('indexPatternFieldEditor__previewFieldList__item', {
    'indexPatternFieldEditor__previewFieldList__item--highlighted': isFromScript,
    'indexPatternFieldEditor__previewFieldList__item--pinned': isPinned,
  });
  /* eslint-enable @typescript-eslint/naming-convention */

  const doesContainImage = formattedValue?.includes('<img');

  const renderName = () => {
    if (isFromScript && !Boolean(key)) {
      return (
        <span className="indexPatternFieldEditor__previewFieldList--ligthWeight">
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
        <span className="indexPatternFieldEditor__previewFieldList--ligthWeight">
          <IsUpdatingIndicator />
        </span>
      );
    }

    if (hasScriptError) {
      return (
        <div>
          <EuiBadge iconType="alert" color="danger" data-test-subj="scriptErrorBadge">
            {i18n.translate('indexPatternFieldEditor.fieldPreview.scriptErrorBadgeLabel', {
              defaultMessage: 'Script error',
            })}
          </EuiBadge>
        </div>
      );
    }

    if (isFromScript && value === undefined) {
      return (
        <span className="indexPatternFieldEditor__previewFieldList--ligthWeight">
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
          className="indexPatternFieldEditor__previewFieldList__item__value__wrapper"
          // We  can dangerously set HTML here because this content is guaranteed to have been run through a valid field formatter first.
          dangerouslySetInnerHTML={{ __html: formattedValue! }} // eslint-disable-line react/no-danger
        />
      );
    }

    return withTooltip(
      <span className="indexPatternFieldEditor__previewFieldList__item__value__wrapper">
        {JSON.stringify(value)}
      </span>
    );
  };

  return (
    <>
      <EuiFlexGroup className={classes} gutterSize="none" data-test-subj="listItem">
        <EuiFlexItem className="indexPatternFieldEditor__previewFieldList__item__key">
          <div
            className="indexPatternFieldEditor__previewFieldList__item__key__wrapper"
            data-test-subj="key"
          >
            {renderName()}
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          className="indexPatternFieldEditor__previewFieldList__item__value"
          data-test-subj="value"
        >
          {renderValue()}
        </EuiFlexItem>

        <EuiFlexItem
          className="indexPatternFieldEditor__previewFieldList__item__actions"
          grow={false}
        >
          {toggleIsPinned && (
            <EuiButtonIcon
              onClick={() => {
                toggleIsPinned(key);
              }}
              color="text"
              iconType="pinFilled"
              data-test-subj="pinFieldButton"
              aria-label={i18n.translate(
                'indexPatternFieldEditor.fieldPreview.pinFieldButtonLabel',
                {
                  defaultMessage: 'Pin field',
                }
              )}
              className="indexPatternFieldEditor__previewFieldList__item__actionsBtn"
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
