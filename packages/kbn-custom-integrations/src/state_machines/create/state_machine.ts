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
  createCharacterLimitValidation,
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
import { replaceSpecialChars } from '../../components/create/utils';

export const createPureCreateCustomIntegrationStateMachine = (
  initialContext: DefaultCreateCustomIntegrationContext = DEFAULT_CONTEXT
) =>
  createMachine<
    CreateCustomIntegrationContext,
    CreateCustomIntegrationEvent,
    CreateCustomIntegrationTypestate
  >(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QGEBOYCGAXMyCusWA9gLYCSAdjlKtgJZEUDEAqgAoAiAggCoCiAfQBiZPgBkOAZQDaABgC6iUAAcisOlgYUlIAB6IALACYANCACeiAOwBGKwDpZAVgCcADjc33AZidO3AGwAvkFmaJg4+ISklNS0moz2eBR0KZoYADZ0AF6QTHKKSCCq6gnaRfoIRgZu9t5GnkY2RlZORkYu3gFmlggBRt72Tl0GVgFWVsbeNk4hYejYuATE5FRgNPSJyakadJk5edI2hSpqu4w6ldW19Y3Nre2d3RaILkZDsp-GLhMBAbIBAxzEDhRZRFaxdbxLT2ABu+wg9AoUCYEEYYHsqVhRAA1hjQZFljE1hsynCEUioAgsUQAMabCgFAo6ErncqgSpWab2FwBNyTAxOLkTdw9RD9QYBLxuT6BAwGGx2YEEpbRVZxBnkrKIzTIphgVCoIioezKDLYABmxpI9hV4OJGrJ8O1lOpFGx9LKTIULLOZUu1m5vP58qF3hFbjFfTc7zcnSMTlGRlkBlkLlmoRBC0JashpJhzroECYki4ADU+Myiqz-RVEIqvPYmvyYzZZE1flHWk46jGrG4ut2fkZldnVRCSdDEoXi6WK0cTsU-VoAwgGy4mzYW0123YxlHwwYm7Jpv83k0XO3RxFxw6oZqZyXy5WjIuayu62vFRvm-2dx39xePp2nsb8ZQMKV5XDKxrzBIl1XvMkIDADIwF1KA2HQWEGAIVF0Uxd1cXxMd7QQ-NEmQ1D0MwsBsKIAg3Q9BlvTfZcLk-GwAi6OoGmTW5hkCJwoycFM6gCdwahcQUJicGxYJzCdHRhSi0NSDCsJw2B9UNY1TXNLArVQG07XgvMpwoewVOojT6NgRi6WYhQq1OUoPw5esuICHiYxPBoBICISgKaGxHE+E9ZGafxZAHGDMxM3NJ01WA8AAIxIDR0LwigMRpPFbRI0zErJZK0oytT7M9LQWN9Vz2PctcJOPeoz2GcTAmEt5QKsH4vH8VtOPk28yPM+wSvSrBMoNI0TTNS1rXym9SLMpLUvG9CKsc+RnKXWr2T0etGr4owWq6dxnl6AwXB-Y6wxcGxjAGQalqKmFktpWk4C07b3zq-aqj8Dc3i8Hwxmi9Moy42R7C5dM7sCcT+zkuKCoSpTEgtDA6AyPB0CYAAlPgeDxgBNb62L2q5ZR5Nx5V5WwnH+QED0mJqt2mfw2naJ7CrRiyMaxnGwHxwmSYXGq2VXPivM6B4Gn7Vo7CjYwjysE9OJphVZFsYJkcWnnEJhdBYDQzKyd2yW7sGbrbHbP5hj3CGOmp3kU0CCKhRHYEKCIZD4CKeLFIN36fopxAAFpzvDnX5j11Gg4s7Y0j2LJcggcXa3q4wo08D5PmlAxvGixMMxjuC4-IiyZ0pdO3L+2Sexlmo3BE2xRkjICpUGU7+wRjo41i0uFLvCukioejaQAC0gGvfsqQvovsONoog2Tm4i7wo3cULPl8NX+jaaOs1jwOR5nGfQ4QN4G75VpOmb6DTCA1wN2-RGB043jufLkaq7KIRMdQmnas5NVxXx5DfVw3h74TEfr0VWR4pTuGaOMH4Pwv4nxGlZNSNE6IEHPque6sk6gF26p4GYzgBgHiIXxTiJ5Wi2ATAPI+ZcMErVKhNNS+COKeBfgmGw7NeLayVlJHk9t6FXW6uJEuzCh7DRWu9T6XD6rtBjPYCCHgGaAgBN4XwENnBqLjBzPs4ZfDoOHiNfm2N0BKL+io946jm5-FTFxXRQUC7QzGP8VwAIOgtEPgHcxmojYm04cA82n4WgzHsPvZM9w0w3T0T2SSsk7pswmN4EIIQgA */
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
          return 'data' in event && !(event.data instanceof IntegrationError)
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
                  integrationName:
                    event.fields.integrationName !== undefined
                      ? replaceSpecialChars(event.fields.integrationName)
                      : context.fields.integrationName,
                  datasets:
                    event.fields.datasets !== undefined
                      ? event.fields.datasets.map((dataset) => ({
                          ...dataset,
                          name: replaceSpecialChars(dataset.name),
                        }))
                      : context.fields.datasets,
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
          createCharacterLimitValidation(
            i18n.translate(
              'customIntegrationsPackage.validations.integrationName.characterLimitError',
              {
                defaultMessage: 'An integration name should be less than 100 characters.',
              }
            ),
            100
          ),
        ],
        datasets: createArrayValidator({
          name: [
            createIsEmptyValidation(
              i18n.translate('customIntegrationsPackage.validations.datasets.requiredError', {
                defaultMessage: 'Dataset name is required.',
              })
            ),
            createIsLowerCaseValidation(
              i18n.translate('customIntegrationsPackage.validations.datasets.lowerCaseError', {
                defaultMessage: 'Dataset name should be lowercase.',
              })
            ),
            createCharacterLimitValidation(
              i18n.translate('customIntegrationsPackage.validations.datasets.characterLimitError', {
                defaultMessage: 'A dataset name should be less than 100 characters.',
              }),
              100
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
