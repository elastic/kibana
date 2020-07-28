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

import {
  LegacyAPICaller,
  FakeRequest,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from 'kibana/server';
import { Framework } from '../../../plugin';
import { IndexPatternsFetcher } from '../../../../../data/server';

/**
 * ReqFacade is a regular KibanaRequest object extended with additional service
 * references to ensure backwards compatibility for existing integrations.
 *
 * This will be replaced by standard KibanaRequest and RequestContext objects in a later version.
 */
export type ReqFacade = FakeRequest & {
  framework: Framework;
  payload: unknown;
  pre: {
    indexPatternsService?: IndexPatternsFetcher;
  };
  getUiSettingsService: () => IUiSettingsClient;
  getSavedObjectsClient: () => SavedObjectsClientContract;
  server: {
    plugins: {
      elasticsearch: {
        getCluster: () => {
          callWithRequest: (req: ReqFacade, endpoint: string, params: any) => Promise<any>;
        };
      };
    };
  };
  getEsShardTimeout: () => Promise<number>;
};

export class AbstractSearchStrategy {
  public getCallWithRequestInstance: (req: ReqFacade) => LegacyAPICaller;
  public getSearchRequest: (req: ReqFacade) => any;

  constructor(
    server: any,
    callWithRequestFactory: (server: any, req: ReqFacade) => LegacyAPICaller,
    SearchRequest: any
  ) {
    this.getCallWithRequestInstance = (req) => callWithRequestFactory(server, req);

    this.getSearchRequest = (req) => {
      const callWithRequest = this.getCallWithRequestInstance(req);

      return new SearchRequest(req, callWithRequest);
    };
  }

  async getFieldsForWildcard(req: ReqFacade, indexPattern: string, capabilities: any) {
    const { indexPatternsService } = req.pre;

    return await indexPatternsService!.getFieldsForWildcard({
      pattern: indexPattern,
    });
  }

  checkForViability(
    req: ReqFacade,
    indexPattern: string
  ): { isViable: boolean; capabilities: any } {
    throw new TypeError('Must override method');
  }
}
