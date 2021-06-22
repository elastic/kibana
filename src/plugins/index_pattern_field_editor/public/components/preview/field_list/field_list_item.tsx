/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classnames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

interface Props {
  field: {
    key: string;
    value: string;
  };
  highlighted?: boolean;
}

export const PreviewListItem: React.FC<Props> = ({ field: { key, value }, highlighted }) => {
  /* eslint-disable @typescript-eslint/naming-convention */
  const classes = classnames('indexPatternFieldEditor__previewFieldList__item', {
    'indexPatternFieldEditor__previewFieldList__item--highlighted': highlighted,
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
    </EuiFlexGroup>
  );
};
