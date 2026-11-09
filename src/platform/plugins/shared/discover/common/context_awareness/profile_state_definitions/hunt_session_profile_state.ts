/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { ProfileStateDefinition } from '../profile_state';
import { ProfileStateType } from '../profile_state';

/**
 * State that marks a Discover tab as a Hunt session. The token is an opaque session id issued by
 * the server when a hunt is launched or continued. Discover never interprets it; the server checks
 * the session and its owner on every Hunt action.
 */
export interface HuntSessionState extends SerializableRecord {
  token: string;
}

export const HUNT_SESSION_STATE_DEF: ProfileStateDefinition<HuntSessionState> = {
  key: 'huntSession',
  // Persistent, not Url: the token travels in navigation state and survives a reload of the tab,
  // but is never written to a shareable URL.
  descriptor: {
    token: { type: ProfileStateType.Persistent },
  },
  defaultState: { token: '' },
};
