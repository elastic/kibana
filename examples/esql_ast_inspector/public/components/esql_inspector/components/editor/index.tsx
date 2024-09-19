/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiButton, EuiPanel, EuiSpacer } from '@elastic/eui';
import { Walker } from '@kbn/esql-ast';
import { EsqlEditor } from '../../../esql_editor/esql_editor';
import { useEsqlInspector } from '../../context';
import { useBehaviorSubject } from '../../../../hooks/use_behavior_subject';
import { Annotation } from '../../../annotations';

export const Editor: React.FC = () => {
  const state = useEsqlInspector();
  const src = useBehaviorSubject(state.src$);
  const highlight = useBehaviorSubject(state.highlight$);
  const focusedNode = useBehaviorSubject(state.focusedNode$);
  const limit = useBehaviorSubject(state.limit$);

  const targetsBackdrop: Annotation[] = [];
  const focusBackdrop: Annotation[] = [];
  const query = state.query$.getValue();

  if (focusedNode) {
    const location = focusedNode.location;

    if (location) {
      focusBackdrop.push([
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

  if (query) {
    Walker.walk(query.ast, {
      visitSource: (node) => {
        const location = node.location;
        if (!location) return;
        targetsBackdrop.push([
          location.min,
          location.max + 1,
          (text) => (
            <span
              style={{
                display: 'inline-block',
                margin: -4,
                padding: 4,
                borderRadius: 4,
                background: 'rgb(255, 243, 191)',
              }}
              onMouseEnter={() => {
                state.focusedNode$.next(node);
              }}
            >
              {text}
            </span>
          ),
        ]);
      },
    });
  }

  if (limit) {
    const location = limit.location;

    if (!location) return null;

    targetsBackdrop.push([
      location.min,
      location.max + 1,
      (text) => (
        <span
          style={{
            display: 'inline-block',
            margin: -4,
            padding: 4,
            borderRadius: 4,
            background: 'rgb(255, 243, 191)',
          }}
          onMouseEnter={() => {
            state.focusedNode$.next(limit);
          }}
        >
          {text}
        </span>
      ),
    ]);
  }

  return (
    <>
      <EuiPanel paddingSize="l">
        <div>
          <EuiButton
            size={'s'}
            color="text"
            onClick={() => {
              const value = state.query$.getValue();

              if (!value) {
                return;
              }

              state.src$.next(value.print());
            }}
          >
            Re-format
          </EuiButton>
        </div>
        <EuiSpacer size={'m'} />
        <EsqlEditor
          src={src}
          onChange={(newSrc) => state.src$.next(newSrc)}
          backdrops={[targetsBackdrop, focusBackdrop]}
          highlight={highlight}
        />
      </EuiPanel>
    </>
  );
};
