/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonControlOutput } from '../types';
import { ContainerOutput } from '../../../../../embeddable/public';

export type ControlGroupOutput = ContainerOutput & CommonControlOutput;

export * from '../../../../common/controls/control_group/types';
