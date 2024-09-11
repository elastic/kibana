/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useEsqlInspector } from '../../../../context';
import { useBehaviorSubject } from '../../../../../../hooks/use_behavior_subject';
import { FromCommand } from './components/from_command';
import { LimitCommand } from './components/limit_command';

export const PreviewUi: React.FC = (props) => {
  const state = useEsqlInspector();
  const query = useBehaviorSubject(state.queryLastValid$);

  if (!query) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <FromCommand />
      <EuiSpacer />
      <LimitCommand />
    </>
  );
};
