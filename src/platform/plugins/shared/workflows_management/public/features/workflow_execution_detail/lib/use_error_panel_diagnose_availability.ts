/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_ERROR_PANEL_AI_DIAGNOSE_SETTING_ID } from '@kbn/workflows/common/constants';
import type { DiagnosisContextPackage } from './build_diagnosis_context_package';
import {
  AGENT_BUILDER_REQUIRED_LICENSE_TIER,
  deriveErrorPanelDiagnoseAvailability,
  effectiveErrorPanelDiagnoseState,
  type ErrorPanelDiagnoseState,
} from './derive_error_panel_diagnose_availability';
import {
  clearPendingDiagnoseHandoff,
  loadPendingDiagnoseHandoff,
  savePendingDiagnoseHandoff,
} from './diagnose_pending_handoff';
import {
  diagnoseHandoffErrorToastTitle,
  openFailureDiagnosisChat,
} from './open_failure_diagnosis_chat';
import { useKibana } from '../../../hooks/use_kibana';

export interface OpenDiagnoseOptions {
  contextPackage: DiagnosisContextPackage;
  workflowName: string;
}

export interface ErrorPanelDiagnoseAvailability {
  /** Availability after feature-flag gating (drives CTA layout). */
  state: ErrorPanelDiagnoseState;
  /** Ungated derivation (for tests / debugging). */
  rawState: ErrorPanelDiagnoseState;
  /** Required AB license tier id (e.g. `enterprise`) — not a display string. */
  requiredLicenseTier: string;
  diagnoseFeatureEnabled: boolean;
  /** True while a diagnose handoff is in flight (disables the button). */
  isDiagnoseHandoffInFlight: boolean;
  openDiagnose: (options: OpenDiagnoseOptions) => void;
  openLicenseManagement: () => void;
  licenseManagementHref: string;
}

/**
 * Single availability source for every failed-step error panel. Detection
 * errors and missing Agent Builder degrade to state D.
 */
export const useErrorPanelDiagnoseAvailability = (): ErrorPanelDiagnoseAvailability => {
  const { workflowsManagement, application, http, notifications } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const isAgentBuilderAvailable = agentBuilder != null;
  const hasShowPrivilege = application.capabilities.agentBuilder?.show === true;
  const diagnoseFeatureEnabled = useUiSetting<boolean>(
    WORKFLOWS_ERROR_PANEL_AI_DIAGNOSE_SETTING_ID,
    true
  );

  const [access, setAccess] = useState<{
    hasRequiredLicense: boolean;
    hasLlmConnector: boolean;
  } | null>(null);
  const [isDiagnoseHandoffInFlight, setIsDiagnoseHandoffInFlight] = useState(false);
  const handoffInFlightRef = useRef(false);
  const agentBuilderRef = useRef(agentBuilder);
  agentBuilderRef.current = agentBuilder;
  const httpRef = useRef(http);
  httpRef.current = http;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const refreshAccess = useCallback(async () => {
    const ab = agentBuilderRef.current;
    if (!ab || !hasShowPrivilege) {
      setAccess(null);
      return null;
    }

    try {
      // Prefer a live connector probe so State B can resume after setup.
      // AB's getAgentBuilderAccess caches the first result for the session.
      const connectors = await httpRef.current.get<{ connectors?: unknown[] }>(
        '/internal/inference/connectors'
      );
      const hasLlmConnector = (connectors?.connectors?.length ?? 0) > 0;
      const abAccess = await ab.getAgentBuilderAccess();
      const next = {
        hasRequiredLicense: abAccess.hasRequiredLicense,
        // Prefer live probe when AB cache still says false after connector setup.
        hasLlmConnector: abAccess.hasLlmConnector || hasLlmConnector,
      };
      setAccess(next);
      return next;
    } catch {
      try {
        const result = await ab.getAgentBuilderAccess();
        const next = {
          hasRequiredLicense: result.hasRequiredLicense,
          hasLlmConnector: result.hasLlmConnector,
        };
        setAccess(next);
        return next;
      } catch {
        setAccess(null);
        return null;
      }
    }
  }, [hasShowPrivilege]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess, isAgentBuilderAvailable]);

  const rawState = useMemo(
    () =>
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: isAgentBuilderAvailable,
        hasShowPrivilege,
        access,
      }),
    [isAgentBuilderAvailable, hasShowPrivilege, access]
  );

  const state = useMemo(
    () => effectiveErrorPanelDiagnoseState(rawState, diagnoseFeatureEnabled),
    [rawState, diagnoseFeatureEnabled]
  );

  const runHandoff = useCallback((options: OpenDiagnoseOptions) => {
    const ab = agentBuilderRef.current;
    if (!ab || handoffInFlightRef.current) {
      return;
    }

    handoffInFlightRef.current = true;
    setIsDiagnoseHandoffInFlight(true);

    const releaseInFlight = () => {
      handoffInFlightRef.current = false;
      setIsDiagnoseHandoffInFlight(false);
    };

    try {
      openFailureDiagnosisChat({
        agentBuilder: ab,
        http: httpRef.current,
        contextPackage: options.contextPackage,
        workflowName: options.workflowName,
      });
    } catch (error) {
      clearPendingDiagnoseHandoff();
      const errorObj = error instanceof Error ? error : new Error(String(error));
      notificationsRef.current.toasts.addError(errorObj, {
        title: diagnoseHandoffErrorToastTitle(),
      });
      releaseInFlight();
      return;
    }

    // Keep loading visible briefly so rapid double-clicks cannot open two chats.
    window.setTimeout(releaseInFlight, 400);
  }, []);

  const openDiagnose = useCallback(
    (options: OpenDiagnoseOptions) => {
      if (!agentBuilderRef.current || handoffInFlightRef.current) {
        return;
      }

      // State B: keep the assembled context so completing LLM setup resumes the
      // same handoff without another click. Abandon = leave pending unused
      // (no conversation is created while the AB access boundary blocks chat).
      if (rawState === 'b') {
        savePendingDiagnoseHandoff({
          contextPackage: options.contextPackage,
          workflowName: options.workflowName,
        });
      } else {
        clearPendingDiagnoseHandoff();
      }

      runHandoff(options);
    },
    [rawState, runHandoff]
  );

  // State B: after LLM connector setup, resume the original handoff once.
  useEffect(() => {
    if (!isAgentBuilderAvailable || !diagnoseFeatureEnabled) {
      return;
    }

    const tryResumePending = async () => {
      const pending = loadPendingDiagnoseHandoff();
      if (!pending || handoffInFlightRef.current) {
        return;
      }

      const nextAccess = await refreshAccess();
      if (!nextAccess?.hasRequiredLicense || !nextAccess.hasLlmConnector) {
        return;
      }
      if (handoffInFlightRef.current) {
        return;
      }

      clearPendingDiagnoseHandoff();
      runHandoff(pending);
    };

    const onFocus = () => {
      void tryResumePending();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    void tryResumePending();

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isAgentBuilderAvailable, diagnoseFeatureEnabled, refreshAccess, runHandoff]);

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
      isDiagnoseHandoffInFlight,
      openDiagnose,
      openLicenseManagement,
      licenseManagementHref,
    }),
    [
      state,
      rawState,
      diagnoseFeatureEnabled,
      isDiagnoseHandoffInFlight,
      openDiagnose,
      openLicenseManagement,
      licenseManagementHref,
    ]
  );
};
