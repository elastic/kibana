/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

interface Props {
  field: {
    key: string;
    value: string;
  };
}

export const PreviewListItem: React.FC<Props> = ({ field: { key, value } }) => {
  return (
    <EuiFlexGroup className="indexPatternFieldEditor__previewFieldList__item">
      <EuiFlexItem className="indexPatternFieldEditor__previewFieldList__item__key">
        <div className="indexPatternFieldEditor__previewFieldList__item__key__wrapper">{key}</div>
      </EuiFlexItem>
      <EuiToolTip
        anchorClassName="indexPatternFieldEditor__previewFieldList__item__value"
        position="top"
        content={value}
      >
        <div className="indexPatternFieldEditor__previewFieldList__item__value__wrapper">
          {value}
        </div>
      </EuiToolTip>
    </EuiFlexGroup>
  );
};
