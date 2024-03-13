/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  type ReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { Api } from './types';

export const buildEmbeddable: ReactEmbeddableFactory<object, Api>['buildEmbeddable'] = async (
  state, 
  buildApi,
) => {
  const api = buildApi(
    {
      serializeState: () => {
        return {
          rawState: {},
          references: []
        };
      }
    },
    // embeddable has not state so no comparitors needed
    {}
  );

  return {
    api,
    Component: () => {
      return <div>Hello world</div>
    },
  };
}