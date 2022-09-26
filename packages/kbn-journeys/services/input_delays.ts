/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface InputDelays {
  TYPING: number;
  MOUSE_CLICK: number;
}

const PROFILES: Record<string, InputDelays> = {
  user: {
    TYPING: 500,
    MOUSE_CLICK: 1000,
  },
  asap: {
    TYPING: 5,
    MOUSE_CLICK: 5,
  },
};

export function getInputDelays(): InputDelays {
  const profile = PROFILES[process.env.INPUT_DELAY_PROFILE ?? 'user'];

  if (!profile) {
    throw new Error(
      `invalid INPUT_DELAY_PROFILE value, expected one of (${Object.keys(PROFILES).join(', ')})`
    );
  }

  return profile;
}
