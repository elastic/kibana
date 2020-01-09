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

import { IClusterClient } from '../../elasticsearch';
/* queries the local error index for the current deployment
   (is the info and config provided by using callAsInternalUser? It doesn't look like it)
   returns array of documents in the local index
   these documents may or may not have fixed-version annotations,
   but will have an error recorded along with a signature for the error
*/

export async function getRecords(elasticsearch: IClusterClient) {
  // this is where I start getting confused. `callAsInternalUser` docs only gives the following info:
  /*
  Calls specified endpoint with provided clientParams on behalf of the Kibana internal user. See {@link APICaller}.
  @param endpoint — String descriptor of the endpoint e.g. cluster.getSettings or ping. --> what does 'ping' give us?
  @param clientParams — A dictionary of parameters that will be passed directly to the Elasticsearch JS client.
  @param options — Options that affect the way we call the API and process the result.
  */
  const errorsRecorded = await elasticsearch.callAsInternalUser('ping');
  return [{ errors_recorded: errorsRecorded }];
}
