/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { getParentApi } from '../parent_api';
import { AddButton } from './add_button';
import { TopNav } from './top_nav';
import { lastSavedStateSessionStorage } from '../session_storage/last_saved_state';
import { unsavedChangesSessionStorage } from '../session_storage/unsaved_changes';

export const PresentationContainerExample = ({ uiActions }: { uiActions: UiActionsStart }) => {
  const { cleanUp, componentApi, parentApi } = useMemo(() => {
    return getParentApi();
  }, []);

  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, [cleanUp]);

  const [dataLoading, panels, timeRange] = useBatchedPublishingSubjects(
    parentApi.dataLoading,
    componentApi.panels$,
    parentApi.timeRange$
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
          embeddable with a previous session&apos;s unsaved changes.
        </p>
        <p>
          This example uses session storage to persist saved state and unsaved changes while a
          production implementation may choose to persist state elsewhere.
          <EuiButtonEmpty
            color={'warning'}
            onClick={() => {
              lastSavedStateSessionStorage.clear();
              unsavedChangesSessionStorage.clear();
              window.location.reload();
            }}
          >
            Reset
          </EuiButtonEmpty>
        </p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            isLoading={dataLoading}
            start={timeRange?.from}
            end={timeRange?.to}
            onTimeChange={({ start, end }) => {
              componentApi.setTimeRange({
                from: start,
                to: end,
              });
            }}
            onRefresh={() => {
              componentApi.onReload();
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <TopNav
            onSave={componentApi.onSave}
            resetUnsavedChanges={parentApi.resetUnsavedChanges}
            unsavedChanges$={parentApi.unsavedChanges}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

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
