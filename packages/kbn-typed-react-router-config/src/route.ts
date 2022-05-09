/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Route } from './types';
import { Unconst, unconst } from './unconst';

<<<<<<< HEAD:packages/kbn-typed-react-router-config/src/route.ts
export function route<TRoute extends Route | Route[] | readonly Route[]>(
  r: TRoute
): Unconst<TRoute> {
  return unconst(r);
=======
export interface EsClusterExecOptions {
  skipNativeRealmSetup?: boolean;
  reportTime?: (...args: any[]) => void;
  startTime?: number;
  esArgs?: string[];
  esJavaOpts?: string;
  password?: string;
  skipReadyCheck?: boolean;
  readyTimeout?: number;
  onEarlyExit?: (msg: string) => void;
>>>>>>> c6108ba076c ([ftr] handle unexpected Kibana/ES shutdowns better (#131767)):packages/kbn-es/src/cluster_exec_options.ts
}
