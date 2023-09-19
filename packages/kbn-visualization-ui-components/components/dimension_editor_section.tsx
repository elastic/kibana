/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import './dimension_editor_section.scss';

export const DimensionEditorSection = ({
  children,
  title,
}: {
  title?: string;
  children?: React.ReactNode | React.ReactNode[];
}) => {
  return (
    <div className="lnsDimensionEditorSection">
      <div className="lnsDimensionEditorSection__border" />
      {title && (
        <EuiTitle size="xxs" className="lnsDimensionEditorSection__heading">
          <h3>{title}</h3>
        </EuiTitle>
      )}
      {children}
    </div>
  );
};
