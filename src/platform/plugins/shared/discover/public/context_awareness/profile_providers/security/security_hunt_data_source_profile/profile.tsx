/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { HuntSessionInfo } from '@kbn/discover-shared-plugin/public';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import { HUNT_SESSION_STATE_DEF } from '../../../../../common/context_awareness';
import { isSolutionProfileEnabled } from '../../is_solution_profile_enabled';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createCellRendererAccessor } from '../accessors/get_cell_renderer_accessor';
import { SECURITY_PROFILE_ID } from '../constants';
import type { SecurityDataSourceContext } from '../security_data_source_profile';
import { createSecurityDataSourceProfileProvider } from '../security_data_source_profile';
import { toEvidenceSelection, toStoredFilters } from './hunt_evidence';
import { HuntEvidencePreview } from './hunt_evidence_preview';
import { HuntGuidanceFlyout } from './hunt_guidance_flyout';
import * as i18n from './translations';

/** Most rows one preservation accepts. The server enforces the same limit. */
export const HUNT_MAX_SELECTED_ROWS = 50;

export interface HuntDataSourceContext extends SecurityDataSourceContext {
  /** The verified Hunt session this tab was opened for. */
  huntSession: HuntSessionInfo;
}

/**
 * Hunt mode: Discover's Security data source profile plus the hunt's guidance and an evidence
 * action. It resolves only for a tab opened with signed Hunt session state that the owning plugin
 * verifies, so ordinary Discover sessions, other solution views and forged state never see it.
 */
export const createSecurityHuntDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider<HuntDataSourceContext> => {
  const { profile: securityProfile } = createSecurityDataSourceProfileProvider(services);
  const cellRendererFeature = services.discoverShared.features.registry.getById(
    'security-solution-cell-renderer'
  );

  return {
    profileId: SECURITY_PROFILE_ID.hunt,
    profile: {
      ...securityProfile,
      getAppMenu:
        (prev, { context }) =>
        (params) => {
          const prevValue = prev(params);
          const { definition } = context.huntSession;

          return {
            appMenuRegistry: (registry) => {
              registry.registerCustomItem({
                id: 'hunt-guidance',
                order: 1,
                label: i18n.GUIDANCE_MENU_LABEL,
                iconType: 'crosshair',
                testId: 'discoverAppMenuHuntGuidance',
                render: ({ context: { onFinishAction } }) => (
                  <HuntGuidanceFlyout definition={definition} onClose={onFinishAction} />
                ),
              });

              return prevValue.appMenuRegistry(registry);
            },
          };
        },
      getBulkActions:
        (prev, { context, toolkit }) =>
        (params) => {
          const { investigationId, definition } = context.huntSession;
          const label = investigationId ? i18n.APPEND_ACTION_LABEL : i18n.PRESERVE_ACTION_LABEL;

          return [
            ...prev(params),
            {
              key: 'hunt-preserve-evidence',
              label,
              icon: 'save',
              'data-test-subj': 'discoverHuntPreserveEvidence',
              getDisabledReason: ({ selectedDocs }) =>
                selectedDocs.length > HUNT_MAX_SELECTED_ROWS
                  ? i18n.TOO_MANY_ROWS(HUNT_MAX_SELECTED_ROWS)
                  : undefined,
              onClick: ({ selectedDocs }) => {
                // One id per opened preview: a retry after a failure repeats it, so the server
                // never adds the same evidence twice.
                const preservationId = uuidv4();
                const stateAdapter = toolkit.getStateAdapter(HUNT_SESSION_STATE_DEF);

                const preserve = async (note: string) => {
                  const feature = services.discoverShared.features.registry.getById('hunt-session');
                  const rows = selectedDocs.flatMap((record) => {
                    const selection = toEvidenceSelection(record, definition.resultKind);
                    return selection ? [selection] : [];
                  });
                  if (!feature || rows.length !== selectedDocs.length) {
                    throw new Error(i18n.NOT_AVAILABLE);
                  }

                  const { from, to } = services.timefilter.getTime();
                  const result = await feature.preserveEvidence({
                    token: stateAdapter.getState().token,
                    preservationId,
                    query: isOfAggregateQueryType(params.query) ? params.query.esql : '',
                    filters: toStoredFilters(services.data.query.getState().filters ?? []),
                    timeRange: { from: String(from), to: String(to) },
                    columns: params.columns,
                    dataViewId: params.dataView.id ?? '',
                    ...(note ? { note } : {}),
                    rows,
                  });

                  // The new state is linked to the Investigation, so the next preservation appends.
                  stateAdapter.setState({ token: result.profileToken });
                  services.core.notifications.toasts.addSuccess({
                    title: i18n.SAVED_TITLE,
                    text: toMountPoint(
                      <EuiText size="s">
                        <p>{i18n.SAVED_TEXT(result.addedCount, result.evidenceCount)}</p>
                        <p>
                          <EuiLink
                            href={result.investigationUrl}
                            target="_blank"
                            external
                            data-test-subj="discoverHuntSavedInvestigationLink"
                          >
                            {i18n.VIEW_INVESTIGATION}
                          </EuiLink>
                        </p>
                      </EuiText>,
                      services.core
                    ),
                  });
                };

                const modal = services.core.overlays.openModal(
                  toMountPoint(
                    <HuntEvidencePreview
                      title={label}
                      selectedDocs={selectedDocs}
                      onConfirm={async (note) => {
                        await preserve(note);
                        modal.close();
                      }}
                      onClose={() => modal.close()}
                    />,
                    services.core
                  )
                );
              },
            },
          ];
        },
    },
    resolve: async (params) => {
      const token = params.profileState?.[HUNT_SESSION_STATE_DEF.key]?.token;

      if (typeof token !== 'string' || token === '') {
        return { isMatch: false };
      }

      if (
        !isSolutionProfileEnabled(params.rootContext, SolutionType.Security, services.uiSettings)
      ) {
        return { isMatch: false };
      }

      const huntSessionFeature = services.discoverShared.features.registry.getById('hunt-session');
      const huntSession = await huntSessionFeature?.verifySession(token);

      if (!huntSession) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Security,
          getSecuritySolutionCellRenderer: await createCellRendererAccessor(cellRendererFeature),
          huntSession,
        },
      };
    },
  };
};
