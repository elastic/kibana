/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { getParentApi } from '../parent_api';
import { AddButton } from './add_button';
import { TopNav } from './top_nav';

export const PresentationContainerExample = ({ uiActions }: { uiActions: UiActionsStart }) => {
  const { cleanUp, componentApi, parentApi } = useMemo(() => {
    return getParentApi();
  }, []);

  useEffect(() => {
    cleanUp();
  }, []);

  const [dataLoading, panels, timeRange] = useBatchedPublishingSubjects(
    parentApi.dataLoading,
    componentApi.panels$,
    parentApi.timeRange$,
  );

  return (
    <div>
      <EuiCallOut title="Presentation Container interfaces">
        <p>
          At times, you will need to render many embeddables and allow users to add, remove, and
          re-arrange embeddables. Use the <strong>PresentationContainer</strong> and{' '}
          <strong>CanAddNewPanel</strong> interfaces for this functionallity.
        </p>
        <p>
          Each embeddable manages its own state. The page is only responsible for persisting and
          providing the last persisted state to the embeddable. Implement{' '}
          <strong>HasSerializedChildState</strong> interface to provide an embeddable with last
          persisted state. Implement <strong>HasRuntimeChildState</strong> interface to provide an
          embeddable with previous sessions&apos;s unsaved changes.
        </p>
        <p>
          This example uses session storage to persist saved state and unsaved changes while a
          production implemenation may choose to persist state elsewhere.
        </p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <TopNav
        dataLoading={dataLoading ?? false}
        onReload={componentApi.onReload}
        onSave={componentApi.onSave}
        setTimeRange={componentApi.setTimeRange}
        timeRange={timeRange}
      />

      <EuiSpacer size="m" />

      {panels.map(({ id, type }) => {
        return (
          <div key={id} style={{ height: '200' }}>
            <ReactEmbeddableRenderer
              type={type}
              maybeId={id}
              getParentApi={() => parentApi}
              hidePanelChrome={false}
              onApiAvailable={(api) => {
                componentApi.setChild(id, api);
              }}
            />
            <EuiSpacer size="s" />
          </div>
        );
      })}

      <AddButton parentApi={parentApi} uiActions={uiActions} />
    </div>
  );
};
