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
import url from 'url';
import { DirectAccessLinkGeneratorState } from '../../../src/plugins/direct_access_links/public';
import { DirectAccessLinkSpec } from '../../../src/plugins/direct_access_links/public';

/**
 * The name of the latest variable can always stay the same so code that
 * uses this link generator statically will switch to the latest version.
 * Typescript will warn the developer if incorrect state is being passed
 * down.
 */
export const HELLO_LINK_GENERATOR = 'HELLO_LINK_GENERATOR_V2';

export interface HelloLinkState {
  firstName: string;
  lastName: string;
}

export type HelloLinkGeneratorState = DirectAccessLinkGeneratorState<HelloLinkState>;

export const createHelloPageLinkGenerator = (
  getStartServices: () => Promise<{ appBasePath: string }>
): DirectAccessLinkSpec<typeof HELLO_LINK_GENERATOR> => ({
  id: HELLO_LINK_GENERATOR,
  createUrl: async state => {
    const startServices = await getStartServices();
    const appBasePath = startServices.appBasePath;
    const parsedUrl = url.parse(window.location.href);

    return url.format({
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      pathname: `${appBasePath}/hello`,
      query: {
        ...state,
      },
    });
  },
});

/**
 * The name of this legacy generator id changes, but the *value* stays the same.
 */
export const HELLO_LINK_GENERATOR_V1 = 'HELLO_LINK_GENERATOR';

export interface HelloLinkStateV1 {
  name: string;
}

export type LegacyHelloLinkGeneratorState = DirectAccessLinkGeneratorState<
  HelloLinkStateV1,
  typeof HELLO_LINK_GENERATOR,
  HelloLinkState
>;

export const helloPageLinkGeneratorV1: DirectAccessLinkSpec<typeof HELLO_LINK_GENERATOR_V1> = {
  id: HELLO_LINK_GENERATOR_V1,
  isDeprecated: true,
  migrate: async state => {
    return { id: HELLO_LINK_GENERATOR, state: { firstName: state.name, lastName: '' } };
  },
};
