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

interface Props {
  field: {
    key: string;
    value: string;
    isPinned?: boolean;
  };
  toggleIsPinned?: (name: string) => void;
  highlighted?: boolean;
}

export const PreviewListItem: React.FC<Props> = ({
  field: { key, value, isPinned },
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
          <span className="indexPatternFieldEditor__previewFieldList__item__value__wrapper">
            {value}
          </span>
        </EuiToolTip>
      </EuiFlexItem>
      {toggleIsPinned && (
        <EuiFlexItem
          className="indexPatternFieldEditor__previewFieldList__item__actions"
          grow={false}
        >
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
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
