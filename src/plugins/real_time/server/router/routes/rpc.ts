/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { REAL_TIME_API_PATH } from '../../../common/constants';
import { assertRealTimeContext } from './util/assert_real_time_context';
import { RouteParams } from '../types';
import { handleBoomErrors } from './util/handle_boom_errors';
import { RpcMessageSubscribe } from '../../rpc';

export const rpc = ({ router }: RouteParams) => {
  router.post(
    {
      path: `${REAL_TIME_API_PATH}/_rpc`,
      validate: {
        body: schema.arrayOf(schema.any()),
      },
    },
    handleBoomErrors(
      assertRealTimeContext(async ({ realTime }, req, res) => {
        const body = await realTime.rpc.executeMethod(req.body as RpcMessageSubscribe);
        return res.ok({ body });
      })
    )
  );
};
