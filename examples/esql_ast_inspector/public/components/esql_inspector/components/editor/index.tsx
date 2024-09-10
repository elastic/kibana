/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiCode, EuiPanel } from '@elastic/eui';
import { EsqlEditor } from '../../../esql_editor/esql_editor';
import { useEsqlInspector } from '../../context';
import { useBehaviorSubject } from '../../../../hooks/use_behavior_subject';

export const Editor: React.FC = (props) => {
  const state = useEsqlInspector();
  const src = useBehaviorSubject(state.src$);

  return (
    <EuiPanel paddingSize="l">
      <EsqlEditor src={src} onChange={(newSrc) => state.src$.next(newSrc)} />
    </EuiPanel>
  );
};
