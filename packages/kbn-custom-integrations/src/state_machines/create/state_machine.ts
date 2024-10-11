/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
} from './types';
import {
  datasetNameWillBePrefixed,
  executeFieldsPipeline,
  prefixDatasetName,
} from './pipelines/fields';

export const createPureCreateCustomIntegrationStateMachine = (
  initialContext: DefaultCreateCustomIntegrationContext = DEFAULT_CONTEXT
) =>
  createMachine<
    CreateCustomIntegrationContext,
    CreateCustomIntegrationEvent,
    CreateCustomIntegrationTypestate
  >(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QGEBOYCGAXMyCusWA9gLYCSAdjlKtgJZEUDEAqgAoAiAggCoCiAfQBiZPgBkOAZQDaABgC6iUAAcisOlgYUlIAB6IALACYANCACeh2UYB0ATgBsD6w4DsAVgCMngMyvPAL4BZmiYOPiEpJTUtJqMNngUdEmaGAA2dABekExyikggqupx2gX6CEYGABw2PkZVnk6yjVXVBg5mlgju7TYGxu4eBo1O1UEh6Ni4BMTkVGA09PGJyRp06Vk50p75KmprjDrllTV1DU0tbR0WiK5GPjauHnaydz4G763jIKFTEbPRBaxLQ2ABuGwg9AoUCYEEYYBsyVBRAA1gjfuEZlF5osSmCIVCoAgkUQAMZLCh5PI6IoHUqgcquHyeewOKquOyeKp2Iyedx2HydRA9Aw2Kr8oyybk+HyDdxGb4Y6aROYxCn4jKQzTQphgVCoIioGzKNLYABmhpINiV-2xarx4M1hOJFGR5JKVIUNP2JSOt2ZrPZnO5vP5gpuCH6shsviMDiMdgMnM8zXcismmJVgNxIMddAgTEkXAAanxqQVab6yohvJ47DZeeyOVK+T5ZNcumGxfy65Lk1UHOmwsqATjgfE8wWi6XtrtCj6tH6ELX642ni8Gu42x3EG3o347O4jwLPEZ5YPgj8MyO7UD1ZPCyWy0Y55XF9Xl95V1z1y2t+2hW6D5aglA8j1kAwtyHP4sVVO88QgMA0jAbUoDYdBQQYAhYXhRFXVRdFr1tOCc3iRDkNQ9CwEwogCBdN0KU9V8F0OD9Gl6M46zDDlBgMQD6lFVxrDsET+QcFMmQvCZh2I7NxwoGxyJQ5I0IwrDYF1fVDWNU0sAtVArRtWC5PVJTKLU2jYHoslGIUcs9mKd8GRrBwOPqLiBR41w+IjBo+hExwHHceM+XaVxoMzUd7RBMyVKomjsL1A0jRNc1LWtIjjLHUykOU6F4vU6z3S0Kkdm9RzWOc5dXIcWp3MPTzD28-i-AbYT2WGIS4w8CKbxI+SbFgPAACMSA0VCcIoBESTRDKZKy6L4iG0bxpUorbPkez5wq+k9EQRt6waM8DCZZlIP6QCfCqaM+XE1420cbw00vIys2yvFlrGrAJqS7TUr09LXqi+CQU+1boXWj07K9CsWN244uUO08elOzxzp8rp6lcNq2xOs8grscVnukmC3sWhShtJUk4A0ra30qvaKiedwbC3U8uQTQnxUA9w-OsXnzyMfxgvCl7MrJkH4jNDA6DSPB0CYAAlPgeEVgBNOm4aXIxeVFMMGlkHxXLqDxAJOh4Ux5eM2SN9sB162T3pBaXZflsAlZV9XZ3KultcqWwejZZtxXaOwWtqoSHuZSVIKqB2FslhT0FgFCJs1nal2j+sDHbIWeU5V4eeuhsPAHfw-G5TxRcvCgiEQ+ACiB29SN2+n4cQABaHcEC7mxZH7gfB4H+p44lluEiSFJ1gybIIB9qsquMQC2VFIXecTbzeQk0fgfHydCXnpzGa8FnPK3PxvE+bv3HbGNZB5Pwt0gqU7B35uBsSYg8FJAALSBD4ZuUOolRWb9w5j4Dc1RXCAX8IJZ41hrpOHuKLEmkV373ghAA9uCAeSnyDomKocYBTvB5pKECwZjDtEaImN+-UMFOhKEIGWyE56wwzh+XBgYOTVCITKDGhhxLdgfs0FMCDX5i3mmPAasV8oWQIFgpcaMvC1A+NwpMDhEzuH4k8WoPE7BDBlPyV4tCTIfRGl9VCCiPyShAUyfoR5eZxmaN3eoth86BxvuJdeJinZLW-tTWADcHK+2sUmGorxCGyBvoTdo18jyPFLpQm+1ReY+PJjYF2ct0BWKqpUQmfdXCROia0JwZtnB9wlGA8U+iqhxwkaTXeA1k6pxUjkxmCYAz3A+I9L8HwebxOZq0SoyTxR1KCEAA */
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
              actions: ['clearPreviouslyCreatedIntegration', 'notifyIntegrationCleanup'],
            },
            onError: [
              {
                target: '#failure',
                cond: 'shouldErrorOnFailedCleanup',
                actions: ['storeServerErrors', 'notifyIntegrationCleanupFailed'],
              },
              {
                target: '#submitting',
              },
            ],
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
        clearPreviouslyCreatedIntegration: actions.assign((context, event) => {
          return 'data' in event && 'previouslyCreatedIntegration' in context
            ? ({
                previouslyCreatedIntegration: undefined,
              } as WithPreviouslyCreatedIntegration)
            : {};
        }),
        storeFields: actions.assign((context, event) => {
          if (event.type === 'UPDATE_FIELDS') {
            const [contextResult] = executeFieldsPipeline(context, event);
            return contextResult;
          } else {
            return {};
          }
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
        shouldErrorOnFailedCleanup: (context) => context.options.errorOnFailedCleanup === true,
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
                defaultMessage: 'A dataset name is required.',
              })
            ),
            createIsLowerCaseValidation(
              i18n.translate('customIntegrationsPackage.validations.datasets.lowerCaseError', {
                defaultMessage: 'A dataset name should be lowercase.',
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
        return integrationsClient.createCustomIntegration({
          ...context.fields,
          datasets: context.fields.datasets.map((dataset) => ({
            ...dataset,
            name: datasetNameWillBePrefixed(dataset.name, context.fields.integrationName)
              ? prefixDatasetName(dataset.name, context.fields.integrationName)
              : dataset.name,
          })),
        });
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
      notifyIntegrationCleanup: sendIfDefined(SpecialTargets.Parent)(
        CreateIntegrationNotificationEventSelectors.integrationCleanup
      ),
      notifyIntegrationCleanupFailed: sendIfDefined(SpecialTargets.Parent)(
        CreateIntegrationNotificationEventSelectors.integrationCleanupFailed
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
