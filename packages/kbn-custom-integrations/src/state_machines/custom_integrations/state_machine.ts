/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ActorRefFrom, createMachine, EmittedFrom } from 'xstate';
import { OmitDeprecatedState } from '@kbn/xstate-utils';
import { DEFAULT_CONTEXT } from './defaults';
import { DEFAULT_CONTEXT as DEFAULT_CREATE_CONTEXT } from '../create/defaults';
import {
  CustomIntegrationsContext,
  CustomIntegrationsEvent,
  CustomIntegrationsTypestate,
  DefaultCustomIntegrationsContext,
  InitialState,
} from './types';
import { createCreateCustomIntegrationStateMachine } from '../create/state_machine';
import { IIntegrationsClient } from '../services/integrations_client';
import { CustomIntegrationsNotificationChannel } from './notifications';
import { executeFieldsPipeline, normalizeDatasetNames } from '../create/pipelines/fields';
import { CreateInitialState } from '../create/types';

export const createPureCustomIntegrationsStateMachine = (
  initialContext: DefaultCustomIntegrationsContext = DEFAULT_CONTEXT
) =>
  createMachine<CustomIntegrationsContext, CustomIntegrationsEvent, CustomIntegrationsTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogC0ATgBs8sgEYAHAHYALMs7rV85ctkAmADQgAnonWcysgKwHZmgMwPlN1aoC+382kwcfGJSMnoiXAgaKFYIEjAyGgA3IgBrBICsPFFQ8MjohGSiAGNgki5uCvFBYRzxKQRpdQ8yY3tlRTVOF05OTXMrBGUXJXtZVU1J1UMXTWNffwwsstyIqNQYsGxsImwyfnp8ADNdgFsyTKCc8jz1qELUFNKciqqkEBqREPqZHWNjMj2GzGTiqWQuYyuYyqAaIaFKVScZzydT2EY6FwuBYgS7ZEI3NaQRIQehgVgAGQA8gBBAAiAH0ALKUgBKAFF6cgAHIAFTZAHEWdSechKVyAMpvARCL5id4NaTGHqApyyDzKYxaDywhA9VRkMGycGcZSuPSg7G4lYEyJEggksnitnUlkAYQAEpzeQKhSKxZKeNUZXV5TIXOpZGRNA5-prUUigTq2uoyLNOGjFJoI7N5n4cUsrviwoSIMTSaxxayeV6+YLhaKJVKPsHvqHGs1bBrFJj7JN7I4zJZEJolOpjApZoZ5FD9JaC3iSDaIHaHRXnW7Pdza76G+L6eKeezqYyA7x3p8Q6AFSCEUZe2jVD1ZEidUZNGQI2iO7IbA5ZHPAgXVZbVLe1y0rFlqy3H1639fdD2dE8mwvVsrzDMYozRVx7FUTUxiRdQdWkQwAUMbQRkhZ8XCBTQAOWa5ixAxi7kZXYyTiVAEiKdILnna1mKJW5olY7AwAeJ4VleQNzxbOU0IQLN3wotxphsFFDCI2YDXsOM0Q1I1NVovMrQY25BLWYS2NYLYdj2A5jjOXjAP4szSyEjYRLEopnhCKSz2lWpUMkX4TXfdN-lw0E+kUQihwQHD9W6XRsOmEdXDowtFwE0tlwAIyIKhijAcUwFwbBigAC2iEz8TXF0PRrGC-UbaSAtlVAfkaexbAhdRUQmU1+yBLQdTmWx0xwmxPFmeRc0WZzTJLMg8oK1AipKsrKuqvjrlYCRYHQfAElwI5MGwAAKHpOAASlYGqstc5awHywritK8qqo2e7SGQ2SOrbaRpxTVR2jGXDUXBPRRuMZRAX7EH1HkBR1BcU0jPm+ii0elbXo2j7toW-FxXQUTcFOWA6o3Rq62avcDyPJDWubQK5OC+Leg-VHDA8MdXDUeQdQhSNUY7cdmkxTg5vzQmHqWnG1rezbPqgb7YGJ0nyb2g6jrIE6zsu3pbtV7KnpehW8a2r6dqJknSvJ36Wf++Sug-BR2mMeRerBadRv1f4FDVT3wV69Hpcx2X8g2AAxXACFJCBWHZKk6Wpnd-Qd9rOuIzVYemadOBREHoxRpMQdTJEzRBTUwXUXw81QIhl3gd5VaDR2s+GIwDQ6TQC70XsfxcIjoRTMiOg1XCDAjUPjaoGgvgYZhIDbzOAYMsh0xHboNF7Nwh7i4j7FTMYPcfftZhRtEMqApdohXy82eI7pR2jExEb1D3YsGDpbD6xFnH7DoUE4Zr4uRLPfIKCo5gpmjDpf4fVuoOC-r8I0ZADDaFmvoHQyh2hYmMtbCOy5QIOggaza8XhATTFwtMGMIM2g6iRphWayU+4I3sKAxaTF3JQE8qQp2bMXYozcECHsU5lClyPm4I0mh8LdC0FLY22NnqrXWu9S2KsCGkD4VncMsNwxImfkiDQfVBYKDhglac05wQKA4VjOWyjcZqOVqrdWdtm5tQfg0DUAI5jB17moOY44BZxXVK0Bw1EcH6D5v+fBMtgJ3BjnHZeMl24A2wZGHQ4If5omrsg3UiNWh9RjPpaM4467eCAA */
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'CustomIntegrations',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'create',
        },
        create: {
          invoke: [
            {
              id: 'createCustomIntegration',
              src: 'createCustomIntegration',
            },
          ],
          on: {
            CREATE_INITIALIZED: {
              target: '.initialized',
            },
          },
          states: {
            initialized: {
              meta: {
                _DX_warning_:
                  "These inner initialized states on the top level machine exist primarily so that 'connected' components can block the reading of the state of child machines whilst undefined on the first render cycle",
              },
              on: {
                INTEGRATION_CREATED: {
                  actions: ['notifyIntegrationCreated'],
                },
                INTEGRATION_CLEANUP: {
                  actions: ['notifyIntegrationCleanup'],
                },
                INTEGRATION_CLEANUP_FAILED: {
                  actions: ['notifyIntegrationCleanupFailed'],
                },
              },
            },
          },
        },
        update: {
          // NOTE: Placeholder for the future addition of "Add dataset to existing custom integration"
        },
      },
    },
    {
      actions: {},
      guards: {},
    }
  );

export interface CustomIntegrationsStateMachineDependencies {
  initialContext?: DefaultCustomIntegrationsContext;
  integrationsClient: IIntegrationsClient;
  customIntegrationsNotificationsChannel: CustomIntegrationsNotificationChannel;
  initialState: InitialState;
}

export const createCustomIntegrationsStateMachine = ({
  initialContext,
  integrationsClient,
  customIntegrationsNotificationsChannel,
  initialState,
}: CustomIntegrationsStateMachineDependencies) => {
  return createPureCustomIntegrationsStateMachine(initialContext).withConfig({
    services: {
      createCustomIntegration: (context) => {
        const getInitialContextForCreate = (initialCreateState: CreateInitialState) => {
          const baseAndOptions = {
            ...DEFAULT_CREATE_CONTEXT,
            ...(initialCreateState ? initialCreateState : {}),
            options: {
              ...DEFAULT_CREATE_CONTEXT.options,
              ...(initialCreateState?.options ? initialCreateState.options : {}),
            },
          };
          const fields = initialCreateState.fields
            ? executeFieldsPipeline(baseAndOptions, {
                type: 'UPDATE_FIELDS',
                fields: normalizeDatasetNames(initialCreateState.fields),
              })[0]
            : {};
          return {
            ...baseAndOptions,
            ...fields,
          };
        };

        return createCreateCustomIntegrationStateMachine({
          integrationsClient,
          initialContext:
            initialState.mode === 'create' && initialState.context
              ? getInitialContextForCreate(initialState.context)
              : DEFAULT_CREATE_CONTEXT,
        });
      },
    },
    actions: {
      notifyIntegrationCreated: customIntegrationsNotificationsChannel.notify((context, event) => {
        return event;
      }),
      notifyIntegrationCleanup: customIntegrationsNotificationsChannel.notify((context, event) => {
        return event;
      }),
      notifyIntegrationCleanupFailed: customIntegrationsNotificationsChannel.notify(
        (context, event) => {
          return event;
        }
      ),
    },
  });
};

export type CustomIntegrationsStateMachine = ReturnType<
  typeof createPureCustomIntegrationsStateMachine
>;
export type CustomIntegrationsActorRef = OmitDeprecatedState<
  ActorRefFrom<CustomIntegrationsStateMachine>
>;
export type CustomIntegrationsState = EmittedFrom<CustomIntegrationsActorRef>;
