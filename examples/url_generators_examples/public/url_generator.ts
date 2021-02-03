/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import url from 'url';
import { UrlGeneratorState, UrlGeneratorsDefinition } from '../../../src/plugins/share/public';

/**
 * The name of the latest variable can always stay the same so code that
 * uses this link generator statically will switch to the latest version.
 * Typescript will warn the developer if incorrect state is being passed
 * down.
 */
export const HELLO_URL_GENERATOR = 'HELLO_URL_GENERATOR_V2';

export interface HelloLinkState {
  firstName: string;
  lastName: string;
}

export type HelloLinkGeneratorState = UrlGeneratorState<HelloLinkState>;

export const createHelloPageLinkGenerator = (
  getStartServices: () => Promise<{ appBasePath: string }>
): UrlGeneratorsDefinition<typeof HELLO_URL_GENERATOR> => ({
  id: HELLO_URL_GENERATOR,
  createUrl: async (state) => {
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
export const HELLO_URL_GENERATOR_V1 = 'HELLO_URL_GENERATOR';

export interface HelloLinkStateV1 {
  name: string;
}

export type LegacyHelloLinkGeneratorState = UrlGeneratorState<
  HelloLinkStateV1,
  typeof HELLO_URL_GENERATOR,
  HelloLinkState
>;

export const helloPageLinkGeneratorV1: UrlGeneratorsDefinition<typeof HELLO_URL_GENERATOR_V1> = {
  id: HELLO_URL_GENERATOR_V1,
  isDeprecated: true,
  migrate: async (state) => {
    return { id: HELLO_URL_GENERATOR, state: { firstName: state.name, lastName: '' } };
  },
};
