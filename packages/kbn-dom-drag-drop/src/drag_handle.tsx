/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';

export const DragHandle: React.FC = (props) => {
  return (
    <div className="domDragDrop__dragHandle" data-test-subj="domDragDrop__dragHandle" {...props}>
      <EuiIcon type="grab" />
    </div>
  );
};
