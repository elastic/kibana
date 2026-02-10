/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

/* eslint-disable no-var */

import type {
  ActorRefLike,
  AnyActorRef,
  InspectedActorEvent,
  InspectedEventEvent,
  InspectedSnapshotEvent,
  InspectionEvent,
} from 'xstate';
import { isDevMode } from './dev_tools';

declare global {
  var __XSTATE_LOGGER_ENABLED__: boolean;
  var toggleXstateInspector: () => void;
}

let isHelpMessageLogged = false;
const setupDevToolsInspector = () => {
  if (!isHelpMessageLogged) {
    console.info(
      `ℹ️ To toggle the XState inspector, for advanced debugging, run toggleXstateInspector() on your browser console.`
    );
    isHelpMessageLogged = true;

    const isEnabled = localStorage.getItem('__XSTATE_LOGGER_ENABLED__') === 'true';

    globalThis.__XSTATE_LOGGER_ENABLED__ = isEnabled;
    globalThis.toggleXstateInspector = toggleXstateInspector;
  }
};

const toggleXstateInspector = () => {
  globalThis.__XSTATE_LOGGER_ENABLED__ = !globalThis.__XSTATE_LOGGER_ENABLED__;
  localStorage.setItem(
    '__XSTATE_LOGGER_ENABLED__',
    globalThis.__XSTATE_LOGGER_ENABLED__.toString()
  );

  console.info(
    `ℹ️ XState inspector ${globalThis.__XSTATE_LOGGER_ENABLED__ ? 'enabled' : 'disabled'}`
  );
};

export const createConsoleInspector = () => {
  if (!isDevMode()) {
    return () => {};
  }

  setupDevToolsInspector();

  const log = (...args: Parameters<typeof console.info>) =>
    globalThis.__XSTATE_LOGGER_ENABLED__ ? console.info(...args) : undefined;

  const logActorEvent = (actorEvent: InspectedActorEvent) => {
    if (isActorRef(actorEvent.actorRef)) {
      log(
        '✨ %c%s%c is a new actor of type %c%s%c:',
        ...styleAsActor(actorEvent.actorRef.id),
        ...styleAsKeyword(actorEvent.type),
        actorEvent.actorRef
      );
    } else {
      log('✨ New %c%s%c actor without id:', ...styleAsKeyword(actorEvent.type), actorEvent);
    }
  };

  const logEventEvent = (eventEvent: InspectedEventEvent) => {
    if (isActorRef(eventEvent.actorRef)) {
      log(
        '🔔 %c%s%c received event %c%s%c from %c%s%c:',
        ...styleAsActor(eventEvent.actorRef.id),
        ...styleAsKeyword(eventEvent.event.type),
        ...styleAsKeyword(eventEvent.sourceRef?.sessionId),
        eventEvent
      );
    } else {
      log('🔔 Event', ...styleAsKeyword(eventEvent.event.type), ':', eventEvent);
    }
  };

  const logSnapshotEvent = (snapshotEvent: InspectedSnapshotEvent) => {
    if (isActorRef(snapshotEvent.actorRef)) {
      log(
        '📸 %c%s%c updated due to %c%s%c:',
        ...styleAsActor(snapshotEvent.actorRef.id),
        ...styleAsKeyword(snapshotEvent.event.type),
        snapshotEvent.snapshot
      );
    } else {
      log('📸 Snapshot due to %c%s%c:', ...styleAsKeyword(snapshotEvent.event.type), snapshotEvent);
    }
  };

  return (inspectionEvent: InspectionEvent) => {
    if (inspectionEvent.type === '@xstate.actor') {
      logActorEvent(inspectionEvent);
    } else if (inspectionEvent.type === '@xstate.event') {
      logEventEvent(inspectionEvent);
    } else if (inspectionEvent.type === '@xstate.snapshot') {
      logSnapshotEvent(inspectionEvent);
    } else {
      log(`❓ Received inspection event:`, inspectionEvent);
    }
  };
};

const isActorRef = (actorRefLike: ActorRefLike): actorRefLike is AnyActorRef =>
  'id' in actorRefLike;

const keywordStyle = 'font-weight: bold';
const styleAsKeyword = (value: any) => [keywordStyle, value, ''] as const;

const actorStyle = 'font-weight: bold; text-decoration: underline';
const styleAsActor = (value: any) => [actorStyle, value, ''] as const;
