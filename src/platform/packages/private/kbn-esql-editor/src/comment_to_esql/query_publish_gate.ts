/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';

/**
 * Suppresses publishing editor text while a generated preview is inserted in the model.
 * Hold before the preview edit; release before accept/reject so those edits publish.
 */
export interface QueryPublishGate {
  hold: () => void;
  release: () => void;
}

export type QueryPublishGateRef = MutableRefObject<QueryPublishGate>;
