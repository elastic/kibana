/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageSection, EuiSkeletonText } from '@elastic/eui';
import React, { FunctionComponent } from 'react';

export const EditorContentSpinner: FunctionComponent = () => {
  return (
    <EuiPageSection className="conApp__editor__spinner">
      <EuiSkeletonText lines={10} />
    </EuiPageSection>
  );
};
