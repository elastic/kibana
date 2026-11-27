/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import type { MutationStatus } from '@kbn/react-query';
import type { InstallFormField, TemplateBody } from '@kbn/workflows-library';
import type { TemplateStep } from './events';
import { useTemplateTelemetryFields } from './template_telemetry_fields';
import { useLibraryTelemetry } from './use_library_telemetry';
import { useLoadedConnectors } from '../hooks/use_connectors';

export interface TemplateSetupTelemetryParams {
  template: TemplateBody;
  /** `custom` is an imported file. */
  installMode: 'catalog' | 'custom';
  fields: InstallFormField[];
  step: TemplateStep;
  /** The install form's validation errors, by field name. */
  fieldErrors: Record<string, string>;
  installStatus: MutationStatus;
}

export interface TemplateSetupTelemetry {
  reportRemixClicked: () => void;
}

/** Connector types of every connector field in the form, required or optional. */
const getConnectorTypes = (fields: InstallFormField[]): string[] => [
  ...new Set(
    fields.flatMap((field) => (field.inputType === 'connector' ? [field.connectorType] : []))
  ),
];

/** Reports the setup of a template: opening the install form, leaving it, and Remix with AI. */
export const useTemplateSetupTelemetry = ({
  template,
  installMode,
  fields,
  step,
  fieldErrors,
  installStatus,
}: TemplateSetupTelemetryParams): TemplateSetupTelemetry => {
  const telemetry = useLibraryTelemetry();
  const templateTelemetry = useTemplateTelemetryFields(template, installMode);
  const connectorTypes = useMemo(() => getConnectorTypes(fields), [fields]);
  // Only a catalog template's connector types are sent, so only then is the connector list needed.
  const needsConnectorList =
    templateTelemetry.templateOrigin === 'catalog' && connectorTypes.length > 0;
  const {
    data: connectors,
    status: connectorsStatus,
    isFetchedAfterMount: isConnectorListLoaded,
  } = useLoadedConnectors();

  const hasOpenedSetup = useRef(false);
  const isSetupReported = useRef(false);
  const hasRemixed = useRef(false);

  const reportSetupOpened = useCallback(
    (connectorTypesExisting?: string[]) => {
      isSetupReported.current = true;
      telemetry.reportTemplateSetupOpened(templateTelemetry, {
        formFieldCount: fields.length,
        connectorTypes,
        connectorTypesExisting,
      });
    },
    [connectorTypes, fields.length, telemetry, templateTelemetry]
  );

  // A setup still waiting for the connector list is reported without the existing connector
  // types when the user ends it, so the events keep the order of the user's actions.
  const flushSetupOpened = useCallback(() => {
    if (hasOpenedSetup.current && !isSetupReported.current) {
      reportSetupOpened();
    }
  }, [reportSetupOpened]);

  // Once per template view. The connector pickers on the setup step load the connector list,
  // with their own retries; the report waits for their result instead of requesting it.
  useEffect(() => {
    if (step === 'setup') {
      hasOpenedSetup.current = true;
    }
    if (!hasOpenedSetup.current || isSetupReported.current) {
      return;
    }
    if (!needsConnectorList) {
      reportSetupOpened([]);
      return;
    }
    if (!isConnectorListLoaded) {
      return;
    }
    reportSetupOpened(
      connectorsStatus === 'success' && connectors
        ? connectorTypes.filter((connectorType) =>
            connectors.some(({ actionTypeId }) => actionTypeId === connectorType)
          )
        : undefined
    );
  }, [
    connectorTypes,
    connectors,
    connectorsStatus,
    isConnectorListLoaded,
    needsConnectorList,
    reportSetupOpened,
    step,
  ]);

  // Leaving the template after opening setup, without installing or remixing, abandons it.
  // Best effort: closing the browser tab unmounts nothing.
  useUnmount(() => {
    if (!hasOpenedSetup.current) {
      return;
    }
    flushSetupOpened();
    // An install that is running or done, or a remix, continues the setup.
    if (hasRemixed.current || installStatus === 'loading' || installStatus === 'success') {
      return;
    }
    telemetry.reportTemplateSetupAbandoned(templateTelemetry, Object.keys(fieldErrors));
  });

  const reportRemixClicked = useCallback(() => {
    hasRemixed.current = true;
    flushSetupOpened();
    telemetry.reportTemplateRemixClicked(templateTelemetry, step);
  }, [flushSetupOpened, step, telemetry, templateTelemetry]);

  return { reportRemixClicked };
};
