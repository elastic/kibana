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
import { Annotation } from '../../../annotations';

export const Editor: React.FC = (props) => {
  const state = useEsqlInspector();
  const src = useBehaviorSubject(state.src$);
  const highlight = useBehaviorSubject(state.highlight$);
  const focusedNode = useBehaviorSubject(state.focusedNode$);

  const backdrop: Annotation[] = [];

  if (focusedNode) {
    const location = focusedNode.location;

    if (location) {
      backdrop.push([
        location.min,
        location.max + 1,
        (text) => (
          <span
            style={{
              display: 'inline-block',
              margin: -4,
              padding: 4,
              borderRadius: 4,
              background: 'rgb(190, 237, 224)',
            }}
          >
            {text}
          </span>
        ),
      ]);
    }
  }

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
          backdrop={backdrop}
          highlight={highlight}
        />
      </EuiPanel>
    </>
  );
};
