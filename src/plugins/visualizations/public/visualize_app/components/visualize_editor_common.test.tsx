/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';
import { VisualizeEditorCommon } from './visualize_editor_common';
import { VisualizeEditorVisInstance } from '../types';
import { SplitChartWarning } from './split_chart_warning';

const mockGetLegacyUrlConflict = jest.fn();
const mockRedirectLegacyUrl = jest.fn(() => Promise.resolve());
jest.mock('@kbn/kibana-react-plugin/public', () => ({
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

jest.mock('../../services', () => ({
  getUISettings: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

describe('VisualizeEditorCommon', () => {
  it('should display a conflict callout if saved object conflicts', async () => {
    shallowWithIntl(
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
    mountWithIntl(
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
                aliasPurpose: 'savedObjectConversion',
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
    expect(mockRedirectLegacyUrl).toHaveBeenCalledWith({
      path: '#/edit/alias_id?_g=test',
      aliasPurpose: 'savedObjectConversion',
      objectNoun: 'TSVB visualization',
    });
  });

  it('should display a warning callout for new heatmap implementation with split aggs', async () => {
    const wrapper = shallowWithIntl(
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
                title: 'Heatmap',
                name: 'heatmap',
              },
              data: {
                aggs: {
                  aggs: [
                    {
                      schema: 'split',
                    },
                  ],
                },
              },
            },
          } as unknown as VisualizeEditorVisInstance
        }
      />
    );
    expect(wrapper.find(SplitChartWarning).length).toBe(1);
  });

  it('should not display a warning callout for XY charts with split aggs', async () => {
    const wrapper = shallowWithIntl(
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
                title: 'XY',
                name: 'line',
              },
              data: {
                aggs: {
                  aggs: [
                    {
                      schema: 'split',
                    },
                  ],
                },
              },
            },
          } as unknown as VisualizeEditorVisInstance
        }
      />
    );
    expect(wrapper.find(SplitChartWarning).length).toBe(0);
  });
});
