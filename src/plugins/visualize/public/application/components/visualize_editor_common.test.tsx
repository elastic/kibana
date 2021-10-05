/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { VisualizeEditorCommon } from './visualize_editor_common';
import { VisualizeEditorVisInstance } from '../types';

const mockGetLegacyUrlConflict = jest.fn();
const mockRedirectLegacyUrl = jest.fn(() => Promise.resolve());
jest.mock('../../../../kibana_react/public', () => ({
  useKibana: jest.fn(() => ({
    services: {
      spaces: {
        ui: {
          redirectLegacyUrl: mockRedirectLegacyUrl,
          components: {
            getLegacyUrlConflict: mockGetLegacyUrlConflict,
          },
        },
      },
      history: {
        location: {
          search: '?_g=test',
        },
      },
      http: {
        basePath: {
          prepend: (url: string) => url,
        },
      },
    },
  })),
  withKibana: jest.fn((comp) => comp),
}));

describe('VisualizeEditorCommon', () => {
  it('should display a conflict callout if saved object conflicts', async () => {
    shallow(
      <VisualizeEditorCommon
        appState={null}
        hasUnsavedChanges={false}
        setHasUnsavedChanges={() => {}}
        hasUnappliedChanges={false}
        isEmbeddableRendered={false}
        onAppLeave={() => {}}
        visEditorRef={React.createRef()}
        visInstance={
          {
            savedVis: {
              id: 'test',
              sharingSavedObjectProps: {
                outcome: 'conflict',
                aliasTargetId: 'alias_id',
              },
            },
            vis: {
              type: {
                title: 'TSVB',
              },
            },
          } as VisualizeEditorVisInstance
        }
      />
    );
    expect(mockGetLegacyUrlConflict).toHaveBeenCalledWith({
      currentObjectId: 'test',
      objectNoun: 'TSVB visualization',
      otherObjectId: 'alias_id',
      otherObjectPath: '#/edit/alias_id?_g=test',
    });
  });

  it('should redirect to new id if saved object aliasMatch', async () => {
    mount(
      <VisualizeEditorCommon
        appState={null}
        hasUnsavedChanges={false}
        setHasUnsavedChanges={() => {}}
        hasUnappliedChanges={false}
        isEmbeddableRendered={false}
        onAppLeave={() => {}}
        visEditorRef={React.createRef()}
        visInstance={
          {
            savedVis: {
              id: 'test',
              sharingSavedObjectProps: {
                outcome: 'aliasMatch',
                aliasTargetId: 'alias_id',
              },
            },
            vis: {
              type: {
                title: 'TSVB',
              },
            },
          } as VisualizeEditorVisInstance
        }
      />
    );
    expect(mockRedirectLegacyUrl).toHaveBeenCalledWith(
      '#/edit/alias_id?_g=test',
      'TSVB visualization'
    );
  });
});
