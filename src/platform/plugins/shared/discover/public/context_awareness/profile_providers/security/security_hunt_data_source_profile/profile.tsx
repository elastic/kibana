/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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
                iconType: 'training',
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
        (prev, { context }) =>
        (params) => {
          const { investigationId } = context.huntSession;
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
                const modal = services.core.overlays.openModal(
                  toMountPoint(
                    <HuntEvidencePreview
                      title={label}
                      selectedDocs={selectedDocs}
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
