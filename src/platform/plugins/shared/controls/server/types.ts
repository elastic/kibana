/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';

export type ControlsPersistableStateService = PersistableStateService<EmbeddableStateWithType>;
export type ControlsSetup = ControlsPersistableStateService;
export type ControlsStart = ControlsPersistableStateService;
