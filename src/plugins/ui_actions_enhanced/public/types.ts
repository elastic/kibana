/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaReactOverlays } from '@kbn/kibana-react-plugin/public';
import { ActionFactory } from './dynamic_actions';

export interface CommonlyUsedRange {
  from: string;
  to: string;
  display: string;
}

export type OpenModal = KibanaReactOverlays['openModal'];

export type ActionFactoryRegistry = Map<string, ActionFactory>;
