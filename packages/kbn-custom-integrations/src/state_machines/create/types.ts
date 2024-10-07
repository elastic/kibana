/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CustomIntegrationOptions, IntegrationError } from '../../types';
import {
  CreateCustomIntegrationValue,
  DeleteCustomIntegrationResponse,
} from '../services/integrations_client';
import { IndexedValidationErrors, ValidationErrors } from '../services/validation';

export type CreateCustomIntegrationOptions = CustomIntegrationOptions;

export interface WithTouchedFields {
  touchedFields: Record<keyof CreateCustomIntegrationOptions, boolean>;
}

export type CreateInitialState = Partial<WithOptions> &
  Partial<WithFields> &
  WithPreviouslyCreatedIntegration;

export interface WithOptions {
  options: {
    deletePrevious?: boolean;
    resetOnCreation?: boolean;
    errorOnFailedCleanup?: boolean;
  };
}

export interface WithIntegrationName {
  integrationName: CreateCustomIntegrationOptions['integrationName'];
}

export interface WithPreviouslyCreatedIntegration {
  previouslyCreatedIntegration?: CreateCustomIntegrationOptions;
}

export interface WithDatasets {
  datasets: CreateCustomIntegrationOptions['datasets'];
}

export interface WithFields {
  fields: WithIntegrationName & WithDatasets;
}

export interface WithErrors {
  errors: {
    fields: Partial<{
      integrationName: IntegrationError[];
      datasets: IndexedValidationErrors;
    }> | null;
    general: IntegrationError | null;
  };
}

export interface WithNullishErrors {
  errors: null;
}

export type WithOptionalErrors = WithErrors | WithNullishErrors;

export type DefaultCreateCustomIntegrationContext = WithOptions &
  WithFields &
  WithTouchedFields &
  WithPreviouslyCreatedIntegration &
  WithNullishErrors;

export type CreateCustomIntegrationTypestate =
  | {
      value: 'uninitialized';
      context: DefaultCreateCustomIntegrationContext;
    }
  | {
      value: 'validating';
      context: DefaultCreateCustomIntegrationContext & WithOptionalErrors;
    }
  | { value: 'valid'; context: DefaultCreateCustomIntegrationContext & WithNullishErrors }
  | {
      value: 'validationFailed';
      context: DefaultCreateCustomIntegrationContext & WithErrors;
    }
  | { value: 'submitting'; context: DefaultCreateCustomIntegrationContext & WithNullishErrors }
  | { value: 'success'; context: DefaultCreateCustomIntegrationContext & WithNullishErrors }
  | { value: 'failure'; context: DefaultCreateCustomIntegrationContext & WithErrors }
  | {
      value: 'deletingPrevious';
      context: DefaultCreateCustomIntegrationContext & WithNullishErrors;
    };

export type CreateCustomIntegrationContext = CreateCustomIntegrationTypestate['context'];

export interface UpdateFieldsEvent {
  type: 'UPDATE_FIELDS';
  fields: Partial<CreateCustomIntegrationOptions>;
}

export type CreateCustomIntegrationEvent =
  | UpdateFieldsEvent
  | {
      type: 'INITIALIZE';
    }
  | {
      type: 'SAVE';
    }
  | {
      type: 'RETRY';
    }
  // NOTE: These aren't ideal but they're more helpful than the DoneInvokeEvent<> and ErrorPlatformEvent types
  | {
      type: 'error.platform.validating:invocation[0]';
      data: { errors: ValidationErrors };
    }
  | {
      type: 'error.platform.submitting:invocation[0]';
      data: IntegrationError;
    }
  | {
      type: 'done.invoke.submitting:invocation[0]';
      data: CreateCustomIntegrationValue;
    }
  | {
      type: 'done.invoke.CreateCustomIntegration.deletingPrevious:invocation[0]';
      data: DeleteCustomIntegrationResponse;
    }
  | {
      type: 'error.platform.CreateCustomIntegration.deletingPrevious:invocation[0]';
      data: IntegrationError;
    };
