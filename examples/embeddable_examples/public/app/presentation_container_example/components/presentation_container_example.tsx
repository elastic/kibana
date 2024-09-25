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
import { getPageApi } from '../page_api';
import { AddButton } from './add_button';
import { TopNav } from './top_nav';
import { lastSavedStateSessionStorage } from '../session_storage/last_saved_state';
import { unsavedChangesSessionStorage } from '../session_storage/unsaved_changes';

export const PresentationContainerExample = ({ uiActions }: { uiActions: UiActionsStart }) => {
  const { cleanUp, componentApi, pageApi } = useMemo(() => {
    return getPageApi();
  }, []);

  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, [cleanUp]);

  const [dataLoading, panels, timeRange] = useBatchedPublishingSubjects(
    pageApi.dataLoading,
    componentApi.panels$,
    pageApi.timeRange$
  );

  return (
    <div>
      <EuiCallOut title="Presentation Container interfaces">
        <p>
          At times, you will need to render many embeddables and allow users to add and remove
          embeddables. Use the <strong>PresentationContainer</strong> and{' '}
          <strong>CanAddNewPanel</strong> interfaces for this functionallity.
        </p>
        <p>
          New embeddable state is provided to the page by calling{' '}
          <strong>pageApi.addNewPanel</strong>. The page provides new embeddable state to the
          embeddable with <strong>pageApi.getRuntimeStateForChild</strong>.
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
            resetUnsavedChanges={pageApi.resetUnsavedChanges}
            unsavedChanges$={pageApi.unsavedChanges}
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
              getParentApi={() => pageApi}
              hidePanelChrome={false}
              onApiAvailable={(api) => {
                componentApi.setChild(id, api);
              }}
            />
            <EuiSpacer size="s" />
          </div>
        );
      })}

      <AddButton pageApi={pageApi} uiActions={uiActions} />
    </div>
  );
};
