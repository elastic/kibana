/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiButton, EuiPanel, EuiSpacer } from '@elastic/eui';
import { EsqlEditor } from '../../../esql_editor/esql_editor';
import { useEsqlInspector } from '../../context';
import { useBehaviorSubject } from '../../../../hooks/use_behavior_subject';

export const Editor: React.FC = (props) => {
  const state = useEsqlInspector();
  const src = useBehaviorSubject(state.src$);

  return (
    <>
      <EuiPanel paddingSize="l">
        <div>
          <EuiButton
            size={'s'}
            color="text"
            onClick={() => {
              const query = state.query$.getValue();

              if (!query) {
                return;
              }

              state.src$.next(query.print());
            }}
          >
            Re-format
          </EuiButton>
        </div>
        <EuiSpacer size={'m'} />
        <EsqlEditor
          src={src}
          onChange={(newSrc) => state.src$.next(newSrc)}
          highlight={[
            [4, (text) => <span style={{ color: 'red' }}>{text}</span>],
            1,
            [5, (text) => <span style={{ color: 'blue' }}>{text}</span>],
            3,
            [5, (text) => <span style={{ color: 'red' }}>{text}</span>],
            1,
            [2, (text) => <span style={{ color: 'green' }}>{text}</span>],
          ]}
        />
      </EuiPanel>
    </>
  );
};
