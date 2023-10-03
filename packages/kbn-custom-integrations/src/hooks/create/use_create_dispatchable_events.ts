/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useActor, useSelector } from '@xstate/react';
import { useMemo } from 'react';
import { isUninitializedSelector, isValidSelector } from '../../state_machines/create/selectors';
import { CreateCustomIntegrationActorRef } from '../../state_machines/create/state_machine';
import { CreateCustomIntegrationOptions } from '../../state_machines/create/types';

export const useCreateDispatchableEvents = ({
  machineRef,
}: {
  machineRef: CreateCustomIntegrationActorRef;
}) => {
  const [, send] = useActor<CreateCustomIntegrationActorRef>(machineRef);
  const isValid = useSelector(machineRef, isValidSelector);
  const isUninitialized = useSelector(machineRef, isUninitializedSelector);
  const dispatchableEvents = useMemo(() => {
    return {
      saveCreateFields: isValid ? () => send({ type: 'SAVE' }) : undefined,
      updateCreateFields: !isUninitialized
        ? (fields: Partial<CreateCustomIntegrationOptions>) =>
            send({ type: 'UPDATE_FIELDS', fields })
        : undefined,
    };
  }, [isUninitialized, isValid, send]);

  return dispatchableEvents;
};

export type CreateDispatchableEvents = ReturnType<typeof useCreateDispatchableEvents>;
