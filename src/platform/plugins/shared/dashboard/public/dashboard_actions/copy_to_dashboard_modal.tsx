/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadio,
  EuiSpacer,
} from '@elastic/eui';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { LazyDashboardPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/constants';
import { CREATE_NEW_DASHBOARD_URL, createDashboardEditUrl } from '../utils/urls';
import { embeddableService } from '../services/kibana_services';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';
import { dashboardCopyToDashboardActionStrings } from './_dashboard_actions_strings';
import type { CopyToDashboardAPI } from './copy_to_dashboard_action';

interface CopyToDashboardModalProps {
  api: CopyToDashboardAPI;
  closeModal: () => void;
}

const DashboardPicker = withSuspense(LazyDashboardPicker);

export function CopyToDashboardModal({ api, closeModal }: CopyToDashboardModalProps) {
  const stateTransfer = useMemo(() => embeddableService.getStateTransfer(), []);
  const { createNew: canCreateNew, showWriteControls: canEditExisting } = useMemo(
    () => getDashboardCapabilities(),
    []
  );

  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing'>('existing');
  const [selectedDashboard, setSelectedDashboard] = useState<{ id: string; name: string } | null>(
    null
  );

  const dashboardId = api.parentApi.savedObjectId$.value;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    const selectedIds = api.parentApi.selectedPanelIds$?.getValue?.() ?? new Set<string>();
    const panelIdsToCopy =
      selectedIds.has(api.uuid) && selectedIds.size > 0 ? [...selectedIds] : [api.uuid];

    const getPanelAsync = api.parentApi.getDashboardPanelFromIdAsync;
    let states: EmbeddablePackageState[] = [];

    if (getPanelAsync) {
      setIsSubmitting(true);
      try {
        const results = await Promise.allSettled(
          panelIdsToCopy.map((panelId) => getPanelAsync(panelId))
        );
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const p = result.value;
            const grid = p.grid as { w?: number; h?: number };
            states.push({
              type: p.type,
              serializedState: p.serializedState,
              size: {
                width: grid.w ?? DEFAULT_PANEL_WIDTH,
                height: grid.h ?? DEFAULT_PANEL_HEIGHT,
              },
            });
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      for (const panelId of panelIdsToCopy) {
        try {
          const panelToCopy = api.parentApi.getDashboardPanelFromId(panelId);
          const grid = panelToCopy.grid as { w?: number; h?: number };
          states.push({
            type: panelToCopy.type,
            serializedState: panelToCopy.serializedState,
            size: {
              width: grid.w ?? DEFAULT_PANEL_WIDTH,
              height: grid.h ?? DEFAULT_PANEL_HEIGHT,
            },
          });
        } catch {
          // Panel may have been removed; skip it
        }
      }
    }

    if (states.length === 0) return;

    const path =
      dashboardOption === 'existing' && selectedDashboard
        ? `#${createDashboardEditUrl(selectedDashboard.id, true)}`
        : `#${CREATE_NEW_DASHBOARD_URL}`;

    closeModal();
    stateTransfer.navigateToWithEmbeddablePackages('dashboards', {
      state: states,
      path,
    });
  }, [api, dashboardOption, selectedDashboard, closeModal, stateTransfer]);

  const titleId = 'copyToDashboardTitle';
  const descriptionId = 'copyToDashboardDescription';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId} component="h2">
          {dashboardCopyToDashboardActionStrings.getDisplayName()}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>
          <EuiFormRow hasChildLabel={false}>
            <div data-test-subj="add-to-dashboard-options">
              {canEditExisting && (
                <>
                  <EuiRadio
                    checked={dashboardOption === 'existing'}
                    data-test-subj="add-to-existing-dashboard-option"
                    id="existing-dashboard-option"
                    name="dashboard-option"
                    label={dashboardCopyToDashboardActionStrings.getExistingDashboardOption()}
                    onChange={() => setDashboardOption('existing')}
                  />
                  <EuiSpacer size="s" />
                  <div>
                    <DashboardPicker
                      isDisabled={dashboardOption !== 'existing'}
                      idsToOmit={dashboardId ? [dashboardId] : undefined}
                      onChange={(dashboard) => {
                        setSelectedDashboard(dashboard);
                        setDashboardOption('existing');
                      }}
                    />
                  </div>
                  <EuiSpacer size="s" />
                </>
              )}
              {canCreateNew && (
                <>
                  <EuiRadio
                    checked={dashboardOption === 'new'}
                    data-test-subj="add-to-new-dashboard-option"
                    id="new-dashboard-option"
                    name="dashboard-option"
                    disabled={!dashboardId}
                    label={dashboardCopyToDashboardActionStrings.getNewDashboardOption()}
                    onChange={() => setDashboardOption('new')}
                  />
                  <EuiSpacer size="s" />
                </>
              )}
            </div>
          </EuiFormRow>
        </>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="cancelCopyToButton" onClick={() => closeModal()}>
          {dashboardCopyToDashboardActionStrings.getCancelButtonName()}
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="confirmCopyToButton"
          onClick={() => void onSubmit()}
          disabled={(dashboardOption === 'existing' && !selectedDashboard) || isSubmitting}
          isLoading={isSubmitting}
        >
          {dashboardCopyToDashboardActionStrings.getAcceptButtonName()}
        </EuiButton>
      </EuiModalFooter>
    </div>
  );
}
