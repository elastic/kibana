/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContextProvider, ContextService } from '../context_service';

export enum SolutionType {
  Observability = 'oblt',
  Security = 'security',
  Search = 'search',
  Default = 'default',
}

export interface RootContext {
  solutionType: SolutionType;
}

export interface RootContextProviderParams {
  solutionNavId?: string | null;
}

export type RootContextProvider = ContextProvider<RootContextProviderParams, RootContext>;

export class RootContextService extends ContextService<RootContextProviderParams, RootContext> {
  protected getDefaultContext(): RootContext {
    return {
      solutionType: SolutionType.Default,
    };
  }
}

export const rootContextService = new RootContextService();

rootContextService.registerProvider({
  order: 0,
  resolve: (params) => {
    if (params.solutionNavId === 'es') {
      return {
        solutionType: SolutionType.Search,
      };
    }
  },
});

rootContextService.registerProvider({
  order: 100,
  resolve: (params) => {
    if (params.solutionNavId === 'oblt') {
      return {
        solutionType: SolutionType.Observability,
      };
    }
  },
});

rootContextService.registerProvider({
  order: 200,
  resolve: (params) => {
    if (params.solutionNavId === 'security') {
      return {
        solutionType: SolutionType.Security,
      };
    }
  },
});
