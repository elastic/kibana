/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { actions, ActorRefFrom, createMachine, EmittedFrom, SpecialTargets } from 'xstate';
import deepEqual from 'react-fast-compare';
import { sendIfDefined, OmitDeprecatedState } from '@kbn/xstate-utils';
import { IntegrationError, NamingCollisionError } from '../../types';
import { IIntegrationsClient } from '../services/integrations_client';
import {
  createArrayValidator,
  createIsEmptyValidation,
  createIsLowerCaseValidation,
  initializeValidateFields,
} from '../services/validation';
import { DEFAULT_CONTEXT } from './defaults';
import { CreateIntegrationNotificationEventSelectors } from './notifications';
import {
  CreateCustomIntegrationContext,
  CreateCustomIntegrationEvent,
  CreateCustomIntegrationTypestate,
  DefaultCreateCustomIntegrationContext,
  WithErrors,
  WithPreviouslyCreatedIntegration,
  WithTouchedFields,
  WithFields,
} from './types';

export const createPureCreateCustomIntegrationStateMachine = (
  initialContext: DefaultCreateCustomIntegrationContext = DEFAULT_CONTEXT
) =>
  createMachine<
    CreateCustomIntegrationContext,
    CreateCustomIntegrationEvent,
    CreateCustomIntegrationTypestate
  >(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QGEBOYCGAXMyCusWA9gLYCSAdjlKtgJZEUDEAqgAoAiAggCoCiAfTIA5fgHEASrzIB5YQOFcAsnwDaABgC6iUAAcisOlgYUdIAB6IALACYANCACeiAIwAOAOwA6NwFYAvv4OaJg4+ISklNS0xoysnLyC3DxcAMp8PKka2kgg+oaxprmWCLYOzgg2bgDMPurVLjZWAJytbc0egcHo2LgExORUYDT0jF54FHSTxhgANnQAXpBMImQ8ZFwAMmQAWmpaZvlGJmYl1TbqXtW+zdUevuXWNt7PzQBsngFBICG94QNRYYxExeOgQWZgFbCNYbbZ7bKHAzHRinRDnS7XW73R4INzNHw2N6+N42L7dUJ9CKDaKjCheABuczB9AoUCYEEYYFBFHpRAA1lzfmF+pEhiNCgymRAWVAEFNeQBjWnZBG5I6FVEIN7NXxeFzEwm+UmePEuHHuN5eGyGklkn49YVUwHikGM+bS4ysphgVCoIioLy6WbYABm-pIXiFlIBYuBYzdzM9svlRCVhRVBzVSI1xUQ2t1+pJRONHlNOLcLi8dqj-1FNIlCYgTFSXAAavscnpsydcwgXOp7l43upbs11CW8TirAOvGPbV17RTa9SgbTJe7m221C5O3luyje-3B8PR+PfCbmuaPJcrB4ifPvjWRSuXWMIGAIUm2Oh6QwCOzOW5XkBUjB1ozrVcJXfT8pigb8wF-IgCDlHlU2VLRVS7Aoe1AEp9XUKwqysD4xwnS8nEQGxmkra171JBcnydWM12gsAvx-P9YG9X1-UDYMsDDVAI0YmN6xBVj2IQziUMVdDNEwvdsIPXDXF8AiiJIs8Lxxao3EIlwPHeT4GLA5dnTjOlYDwAAjEgjCTACKC5FMQJEiDX0smy7KwJMZLQ9MMMzLDkSKFS+2aW8fDnacyPNXSvHUG48XPapUrSlwTKXZ9zLXKzbPs2DuL9AMg1DcNQKypixLGPLvN8lM0xMDNd3VHCLFcCLvDxdQ3hi89S3IiobGqS1EuaZKajS1KMsfUzsuYiUQwwOhZjwdAmAkDIJAATQU1rlPa8LIu63qtIGnFfEi3Sqkaas5qqyCQSWla1shTaeB21Qd0RJTQsOlwOl1PS7mLfrJwovs-CrJKdUmqaZu+CgiHfeBcjcl8LJ+kLNQAWjeHE8cyv55uqukJimY4mSWCAsZzMKDLcDTPinZ4vA8QyPnuInHVEx6xjBCFabakphstTE7jcCtiI6Z4cTHK4bXo2bKt5jz10TWChYOkpb3xW71H1Mierl2oOjou6Vfciz1ZprNfs1SW9YNUGLzNCGXDeSsPEVi3iYetXG1pAAxZaIVt4K6cOx29Wdo0weo816itH3ufAjGWI-NjYPgxCCC1v68IafEDV8Q3450vTZx6pXyT91XrdqgrWXzzUGZsHxbrL7T3ZJaHxthqbUqsVOzIWkErIVBU4FRiPhco61KzuNTqkSgzfFLOLvDGibB4aEeSb5ulntW9AW97a0bEX+56lX+4N-d1ohxHHfd8CQIgA */
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'CreateCustomIntegration',
      initial: 'uninitialized',
      on: {
        UPDATE_FIELDS: {
          target: '#validating',
          actions: 'storeFields',
        },
      },
      states: {
        uninitialized: {
          always: [
            {
              target: 'validating',
              cond: 'shouldValidateInitialContext',
            },
            {
              target: 'untouched',
            },
          ],
          exit: ['notifyInitialized'],
        },
        validating: {
          id: 'validating',
          invoke: {
            src: 'validateFields',
            onDone: {
              target: 'valid',
            },
            onError: {
              target: 'validationFailed',
              actions: ['storeClientErrors'],
            },
          },
        },
        untouched: {},
        valid: {
          id: 'valid',
          entry: ['clearErrors'],
          on: {
            SAVE: [
              {
                target: 'success',
                cond: 'fieldsMatchPreviouslyCreated',
              },
              {
                target: 'deletingPrevious',
                cond: 'shouldCleanup',
              },
              {
                target: '#submitting',
              },
            ],
          },
        },
        validationFailed: {
          id: 'validationFailed',
        },
        deletingPrevious: {
          invoke: {
            src: 'cleanup',
            onDone: {
              target: '#submitting',
            },
            onError: {
              target: '#failure',
              actions: ['storeServerErrors'],
            },
          },
        },
        submitting: {
          id: 'submitting',
          invoke: {
            src: 'save',
            onDone: {
              target: 'success',
              actions: ['storePreviouslyCreatedIntegration'],
            },
            onError: {
              target: 'failure',
              actions: ['storeServerErrors'],
            },
          },
        },
        success: {
          entry: ['notifyIntegrationCreated'],
          always: [
            {
              target: 'resetting',
              cond: 'shouldReset',
            },
          ],
        },
        failure: {
          id: 'failure',
          on: {
            RETRY: [
              {
                target: 'deletingPrevious',
                cond: 'shouldCleanup',
              },
              {
                target: 'submitting',
              },
            ],
          },
        },
        resetting: {
          entry: ['resetValues'],
          always: {
            target: 'untouched',
          },
        },
      },
    },
    {
      actions: {
        storeClientErrors: actions.assign((context, event) => {
          return 'data' in event && 'errors' in event.data
            ? ({
                errors: {
                  fields: event.data.errors,
                  general: null,
                },
              } as WithErrors)
            : {};
        }),
        storeServerErrors: actions.assign((context, event) => {
          return 'data' in event && event.data instanceof IntegrationError
            ? ({
                errors: {
                  ...(event.data instanceof NamingCollisionError
                    ? { fields: { integrationName: [event.data] } }
                    : { fields: {} }),
                  ...(!(event.data instanceof NamingCollisionError)
                    ? { general: event.data }
                    : { general: null }),
                },
              } as WithErrors)
            : {};
        }),
        clearErrors: actions.assign((context, event) => {
          return { errors: null };
        }),
        storePreviouslyCreatedIntegration: actions.assign((context, event) => {
          return 'data' in event && event.type === 'done.invoke.save' && !('error' in event.data)
            ? ({
                previouslyCreatedIntegration: context.fields,
              } as WithPreviouslyCreatedIntegration)
            : {};
        }),
        storeFields: actions.assign((context, event) => {
          return event.type === 'UPDATE_FIELDS'
            ? ({
                fields: {
                  ...context.fields,
                  ...event.fields,
                },
                touchedFields: {
                  ...context.touchedFields,
                  ...Object.keys(event.fields).reduce<WithTouchedFields['touchedFields']>(
                    (acc, field) => ({ ...acc, [field]: true }),
                    {} as WithTouchedFields['touchedFields']
                  ),
                },
              } as WithFields & WithTouchedFields)
            : {};
        }),
        resetValues: actions.assign((context, event) => {
          return {
            fields: DEFAULT_CONTEXT.fields,
            touchedFields: DEFAULT_CONTEXT.touchedFields,
            errors: null,
          };
        }),
      },
      guards: {
        shouldValidateInitialContext: (context) =>
          !deepEqual(DEFAULT_CONTEXT.fields, context.fields),
        fieldsMatchPreviouslyCreated: (context) =>
          deepEqual(context.fields, context.previouslyCreatedIntegration),
        shouldCleanup: (context) =>
          context.options.deletePrevious === true &&
          context.previouslyCreatedIntegration !== undefined,
        shouldReset: (context) => context.options.resetOnCreation === true,
      },
    }
  );

export interface CreateCustomIntegrationStateMachineDependencies {
  initialContext?: DefaultCreateCustomIntegrationContext;
  integrationsClient: IIntegrationsClient;
}

export const createCreateCustomIntegrationStateMachine = ({
  initialContext,
  integrationsClient,
}: CreateCustomIntegrationStateMachineDependencies) => {
  return createPureCreateCustomIntegrationStateMachine(initialContext).withConfig({
    services: {
      validateFields: initializeValidateFields({
        integrationName: [
          createIsEmptyValidation(
            i18n.translate('customIntegrationsPackage.validations.integrationName.requiredError', {
              defaultMessage: 'An integration name is required.',
            })
          ),
          createIsLowerCaseValidation(
            i18n.translate('customIntegrationsPackage.validations.integrationName.lowerCaseError', {
              defaultMessage: 'An integration name should be lowercase.',
            })
          ),
        ],
        datasets: createArrayValidator({
          name: [
            createIsEmptyValidation(
              i18n.translate('customIntegrationsPackage.validations.datasetName.requiredError', {
                defaultMessage: 'Dataset name is required.',
              })
            ),
            createIsLowerCaseValidation(
              i18n.translate('customIntegrationsPackage.validations.datasetName.lowerCaseError', {
                defaultMessage: 'Dataset name should be lowercase.',
              })
            ),
          ],
        }),
      }),
      save: (context) => {
        return integrationsClient.createCustomIntegration(context.fields);
      },
      cleanup: (context) => {
        return integrationsClient.deleteCustomIntegration({
          integrationName: context.previouslyCreatedIntegration!.integrationName, // Value will be set due to the guard.
          version: '1.0.0',
        });
      },
    },
    actions: {
      notifyIntegrationCreated: sendIfDefined(SpecialTargets.Parent)(
        CreateIntegrationNotificationEventSelectors.integrationCreated
      ),
      notifyInitialized: sendIfDefined(SpecialTargets.Parent)(
        CreateIntegrationNotificationEventSelectors.initialized
      ),
    },
  });
};

export type CreateCustomIntegrationStateMachine = ReturnType<
  typeof createPureCreateCustomIntegrationStateMachine
>;
export type CreateCustomIntegrationActorRef = OmitDeprecatedState<
  ActorRefFrom<CreateCustomIntegrationStateMachine>
>;
export type CreateCustomIntegrationState = EmittedFrom<CreateCustomIntegrationActorRef>;
