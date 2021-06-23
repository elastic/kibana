/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classnames from 'classnames';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import type { DocumentField } from './field_list';

interface Props {
  field: DocumentField;
  toggleIsPinned?: (name: string) => void;
  highlighted?: boolean;
}

export const PreviewListItem: React.FC<Props> = ({
  field: { key, value, formattedValue, isPinned = false },
  highlighted,
  toggleIsPinned,
}) => {
  /* eslint-disable @typescript-eslint/naming-convention */
  const classes = classnames('indexPatternFieldEditor__previewFieldList__item', {
    'indexPatternFieldEditor__previewFieldList__item--highlighted': highlighted,
    'indexPatternFieldEditor__previewFieldList__item--pinned': isPinned,
  });
  /* eslint-enable @typescript-eslint/naming-convention */

  return (
    <EuiFlexGroup className={classes} gutterSize="none">
      <EuiFlexItem className="indexPatternFieldEditor__previewFieldList__item__key">
        <div className="indexPatternFieldEditor__previewFieldList__item__key__wrapper">{key}</div>
      </EuiFlexItem>
      <EuiFlexItem className="indexPatternFieldEditor__previewFieldList__item__value">
        <EuiToolTip position="top" content={value}>
          {Boolean(formattedValue) ? (
            <span
              className="indexPatternFieldEditor__previewFieldList__item__value__wrapper"
              // We  can dangerously set HTML here because this content is guaranteed to have been run through a valid field formatter first.
              dangerouslySetInnerHTML={{ __html: formattedValue! }} // eslint-disable-line react/no-danger
            />
          ) : (
            <span className="indexPatternFieldEditor__previewFieldList__item__value__wrapper">
              {value}
            </span>
          )}
        </EuiToolTip>
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
            aria-label={i18n.translate('indexPatternFieldEditor.fieldPreview.pinFieldButtonLabel', {
              defaultMessage: 'Pin field',
            })}
            className="indexPatternFieldEditor__previewFieldList__item__actionsBtn"
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
