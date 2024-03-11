/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';

import React from 'react';

import { CONTENT_ID } from '../../common';
import { LinksInput } from '../embeddable/types';
import { LinksApi } from './types';

export const registerLinksEmbeddable = () => {
  const linksEmbeddableFactory: ReactEmbeddableFactory<LinksInput, LinksApi> = {
    deserializeState: (state) => {
      console.log(`linksReactEmbeddable.deserializeState::${JSON.stringify(state)}`);
      return state.rawState as LinksInput;
    },
    getComponent: async (state, maybeId) => {
      return RegisterReactEmbeddable((apiRef) => {
        return (
          <div>
            <h1>Links Embeddable</h1>
          </div>
        );
      });
    },
  };

  registerReactEmbeddableFactory(CONTENT_ID, linksEmbeddableFactory);
};
