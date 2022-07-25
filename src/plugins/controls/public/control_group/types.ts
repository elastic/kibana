/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerOutput } from '@kbn/embeddable-plugin/public';
import { CommonControlOutput } from '../types';

export type ControlGroupOutput = ContainerOutput & CommonControlOutput;

export {
  type ControlsPanels,
  type ControlGroupInput,
  type ControlPanelState,
  CONTROL_GROUP_TYPE,
} from '../../common/control_group/types';
