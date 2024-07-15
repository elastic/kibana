/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'brace/mode/json';
import './index.scss';

import { EuiErrorBoundary, EuiResizableContainer } from '@elastic/eui';
import { DeepPartial } from '@kbn/utility-types';
import { EventEmitter } from 'events';
import React, { useCallback, useEffect, useState } from 'react';

import { Reference } from '@kbn/content-management-utils';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { SerializedTitles } from '@kbn/presentation-publishing';
import { SavedSearch, SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import {
  EditorRenderProps,
  EmbeddableApiHandler,
  SerializedVis,
  Vis,
  VisParams,
  VISUALIZE_APP_NAME,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '@kbn/visualizations-plugin/public';
import {
  VisualizeApi,
  VisualizeRuntimeState,
  VisualizeSerializedState,
} from '@kbn/visualizations-plugin/public/react_embeddable/types';
import { SerializeStateFn } from '@kbn/visualizations-plugin/public/visualize_app/utils/use/use_embeddable_api_handler';
import { BehaviorSubject } from 'rxjs';
import { DefaultEditorSideBar } from './components/sidebar';

export type DefaultEditorProps = Omit<EditorRenderProps, 'linked'> & {
  initialState: VisualizeSerializedState;
  eventEmitter: EventEmitter;
  embeddableApiHandler: EmbeddableApiHandler;
  dataView?: string;
  savedSearchService: SavedSearchPublicPluginStart;
  references: Reference[];
  onRedirectToLegacy: () => void;
};

function DefaultEditor({
  initialState,
  uiState,
  timeRange,
  filters,
  query,
  dataView,
  embeddableApiHandler,
  eventEmitter,
  savedSearchService,
  references = [],
  onRedirectToLegacy,
}: DefaultEditorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [parentApi] = useState({
    timeRange$: new BehaviorSubject(timeRange),
    query$: new BehaviorSubject(query),
    filters$: new BehaviorSubject(filters),
    dataView$: new BehaviorSubject(dataView),
    isContainer: false,
    type: VISUALIZE_APP_NAME,
  });
  const [titles, setTitles] = useState<SerializedTitles>({ title: '', description: '' });
  const [onUpdateVis, setOnUpdateVis] = useState<
    (serializedVis: DeepPartial<SerializedVis>) => void
  >(() => () => {});
  const [vis, setVis] = useState<Vis<VisParams> | undefined>(undefined);
  const [savedSearch, setSavedSearch] = useState<SavedSearch | undefined>(undefined);

  const onClickCollapse = useCallback(() => {
    setIsCollapsed((value) => !value);
  }, []);

  /**
   * The empty callback is in place to prevent resetting the dragging state of the resize button.
   * The mouseLeave is triggered since a visualization is rendered through another call of "ReactDOM.render()"" in expressions,
   * using the "visRef" node reference.
   * Here is the existing React issue: https://github.com/facebook/react/issues/17064
   */
  const onEditorMouseLeave = useCallback(() => {}, []);

  useEffect(() => {
    parentApi.timeRange$.next(timeRange);
  }, [parentApi, timeRange]);
  useEffect(() => {
    parentApi.query$.next(query);
  }, [parentApi, query]);
  useEffect(() => {
    parentApi.filters$.next(filters);
  }, [parentApi, filters]);
  useEffect(() => {
    parentApi.dataView$.next(dataView);
  }, [parentApi, dataView]);

  const unlinkFromSavedSearch = useCallback(() => {
    setSavedSearch(undefined);
    onUpdateVis({
      data: {
        savedSearchId: undefined,
      },
    });
  }, [setSavedSearch, onUpdateVis]);

  const editorInitialWidth = 30; // getInitialWidth(vis.type.editorConfig.defaultSize);

  return (
    <EuiErrorBoundary>
      <EuiResizableContainer className="visEditor--default" onMouseLeave={onEditorMouseLeave}>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              className="visEditor__visualization"
              initialSize={100 - editorInitialWidth}
              minSize="25%"
              paddingSize="none"
              wrapperProps={{
                className: `visEditor__visualization__wrapper ${
                  isCollapsed ? 'visEditor__visualization__wrapper-expanded' : ''
                }`,
              }}
              data-shared-items-container
              data-title={titles.title}
              data-description={titles.description}
            >
              <ReactEmbeddableRenderer<
                VisualizeSerializedState,
                VisualizeRuntimeState,
                VisualizeApi
              >
                type={VISUALIZE_EMBEDDABLE_TYPE}
                getParentApi={() => ({
                  ...parentApi,
                  getSerializedStateForChild: () => ({
                    rawState: initialState,
                    references,
                  }),
                })}
                onApiAvailable={(api) => {
                  const {
                    openInspector: [, setOpenInspector],
                    navigateToLens: [, setNavigateToLens],
                    serializeState: [, setSerializeState],
                    snapshotState: [, setSnapshotState],
                    getVis: [, setGetVis],
                  } = embeddableApiHandler;
                  setSerializeState(() => api.serializeState as SerializeStateFn);
                  setSnapshotState(() => api.snapshotRuntimeState);
                  setGetVis(() => api.getVis);
                  setOnUpdateVis(() => api.updateVis);
                  setTitles(api.getTitles());

                  const embeddableVis = api.getVis();
                  // Saved object URLs don't contain information about the visualization type
                  // On the edit route, we need to wait until the vis is loaded to determine if it's TSVB or not
                  // If it is, redirect to the legacy editor
                  if (embeddableVis.type.name === 'metrics') {
                    onRedirectToLegacy();
                    return;
                  }

                  setVis(embeddableVis);
                  if (embeddableVis.data.savedSearchId)
                    savedSearchService
                      .get(embeddableVis.data.savedSearchId)
                      .then((result) => setSavedSearch(result));

                  api.subscribeToInitialRender(() => eventEmitter.emit('embeddableRendered'));
                  api.subscribeToHasInspector((hasInspector) => {
                    if (!hasInspector) return;
                    setOpenInspector(() => api.openInspector);
                  });
                  api.subscribeToNavigateToLens((navigateToLens) => {
                    if (!navigateToLens) return;
                    setNavigateToLens(() => navigateToLens);
                  });
                }}
              />
            </EuiResizablePanel>

            <EuiResizableButton
              alignIndicator="start"
              className={`visEditor__resizer ${isCollapsed ? 'visEditor__resizer-isHidden' : ''}`}
            />

            <EuiResizablePanel
              initialSize={editorInitialWidth}
              minSize={isCollapsed ? '0' : '350px'}
              paddingSize="none"
              wrapperProps={{
                className: `visEditor__collapsibleSidebar ${
                  isCollapsed ? 'visEditor__collapsibleSidebar-isClosed' : ''
                }`,
              }}
            >
              {vis && (
                <DefaultEditorSideBar
                  isCollapsed={isCollapsed}
                  onClickCollapse={onClickCollapse}
                  onUpdateVis={onUpdateVis}
                  vis={vis}
                  uiState={uiState}
                  isLinkedSearch={Boolean(savedSearch)}
                  savedSearch={savedSearch}
                  timeRange={timeRange}
                  eventEmitter={eventEmitter}
                  unlinkFromSavedSearch={unlinkFromSavedSearch}
                />
              )}
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    </EuiErrorBoundary>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { DefaultEditor as default };
