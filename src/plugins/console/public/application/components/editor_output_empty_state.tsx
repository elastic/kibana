/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiText, EuiPageSection, EuiSpacer } from '@elastic/eui';

export const EditorOutputEmptyState: FunctionComponent = () => {
  return (
    <EuiPageSection alignment="center" grow={true} className="conApp__editor__spinner">
      <EuiText textAlign="center" size="s">
        <h3>Enter a new request</h3>
        <EuiSpacer size="xs"/>
        <p>When you run a request in the input panel, you will see the output response here.</p>
      </EuiText>
    </EuiPageSection>
  );
};
