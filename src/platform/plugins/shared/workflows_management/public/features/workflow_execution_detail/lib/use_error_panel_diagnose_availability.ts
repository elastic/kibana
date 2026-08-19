/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_ERROR_PANEL_AI_DIAGNOSE_SETTING_ID } from '@kbn/workflows/common/constants';
import { useKibana } from '../../../hooks/use_kibana';
import type { DiagnosisContextPackage } from './build_diagnosis_context_package';
import {
  AGENT_BUILDER_REQUIRED_LICENSE_TIER,
  deriveErrorPanelDiagnoseAvailability,
  effectiveErrorPanelDiagnoseState,
  type ErrorPanelDiagnoseState,
} from './derive_error_panel_diagnose_availability';

export interface ErrorPanelDiagnoseAvailability {
  /** Availability after feature-flag gating (drives CTA layout). */
  state: ErrorPanelDiagnoseState;
  /** Ungated derivation (for tests / debugging). */
  rawState: ErrorPanelDiagnoseState;
  /** Required AB license tier id (e.g. `enterprise`) — not a display string. */
  requiredLicenseTier: string;
  diagnoseFeatureEnabled: boolean;
  openDiagnose: (contextPackage: DiagnosisContextPackage) => void;
  openLicenseManagement: () => void;
  licenseManagementHref: string;
}

/**
 * Single availability source for every failed-step error panel. Detection
 * errors and missing Agent Builder degrade to state D.
 */
export const useErrorPanelDiagnoseAvailability = (): ErrorPanelDiagnoseAvailability => {
  const { workflowsManagement, application } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const hasShowPrivilege = application.capabilities.agentBuilder?.show === true;
  const diagnoseFeatureEnabled = useUiSetting<boolean>(
    WORKFLOWS_ERROR_PANEL_AI_DIAGNOSE_SETTING_ID,
    true
  );

  const [access, setAccess] = useState<{
    hasRequiredLicense: boolean;
    hasLlmConnector: boolean;
  } | null>(null);

  useEffect(() => {
    if (!agentBuilder || !hasShowPrivilege) {
      setAccess(null);
      return;
    }

    let cancelled = false;
    void agentBuilder
      .getAgentBuilderAccess()
      .then((result) => {
        if (!cancelled) {
          setAccess({
            hasRequiredLicense: result.hasRequiredLicense,
            hasLlmConnector: result.hasLlmConnector,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccess(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentBuilder, hasShowPrivilege]);

  const rawState = useMemo(
    () =>
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: agentBuilder != null,
        hasShowPrivilege,
        access,
      }),
    [agentBuilder, hasShowPrivilege, access]
  );

  const state = useMemo(
    () => effectiveErrorPanelDiagnoseState(rawState, diagnoseFeatureEnabled),
    [rawState, diagnoseFeatureEnabled]
  );

  const openDiagnose = useCallback(
    (contextPackage: DiagnosisContextPackage) => {
      if (!agentBuilder) {
        return;
      }
      // States A and B both open chat. When no LLM connector is configured (B),
      // Agent Builder's EmbeddableAccessBoundary routes into AddLlmConnectionPrompt
      // (existing AB onboarding) — do not build a parallel setup UI here.
      //
      // TODO(AB attachment API): prefer a dedicated workflow-failure attachment
      // type once registered on the AB allow-list; text attachment carries the
      // full diagnosis package until then.
      agentBuilder.openChat({
        newConversation: true,
        sessionTag: `workflow-execution-diagnose:${contextPackage.executionId}`,
        attachments: [
          {
            type: AttachmentType.text,
            description: i18n.translate(
              'workflows.executionFlyout.failedStep.diagnoseAttachmentDescription',
              { defaultMessage: 'Workflow step failure diagnosis context' }
            ),
            data: {
              content: JSON.stringify(contextPackage, null, 2),
            },
          },
        ],
      });
    },
    [agentBuilder]
  );

  const openLicenseManagement = useCallback(() => {
    application.navigateToApp('management', { deepLinkId: 'license_management' });
  }, [application]);

  const licenseManagementHref = application.getUrlForApp('management', {
    deepLinkId: 'license_management',
  });

  return useMemo(
    () => ({
      state,
      rawState,
      requiredLicenseTier: AGENT_BUILDER_REQUIRED_LICENSE_TIER,
      diagnoseFeatureEnabled,
      openDiagnose,
      openLicenseManagement,
      licenseManagementHref,
    }),
    [
      state,
      rawState,
      diagnoseFeatureEnabled,
      openDiagnose,
      openLicenseManagement,
      licenseManagementHref,
    ]
  );
};
