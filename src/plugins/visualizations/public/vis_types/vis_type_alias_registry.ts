/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '@kbn/core/types/saved_objects';
import { BaseVisType } from './base_vis_type';

export type VisualizationStage = 'experimental' | 'beta' | 'production';

export interface VisualizationListItem {
  editUrl: string;
  editApp?: string;
  error?: string;
  icon: string;
  id: string;
  stage: VisualizationStage;
  savedObjectType: string;
  title: string;
  description?: string;
  getSupportedTriggers?: () => string[];
  typeTitle: string;
  image?: string;
  type?: BaseVisType | string;
}

export interface VisualizationsAppExtension {
  docTypes: string[];
  searchFields?: string[];
  toListItem: (savedObject: SavedObject) => VisualizationListItem;
}

export interface VisTypeAlias {
  aliasPath: string;
  aliasApp: string;
  name: string;
  title: string;
  icon: string;
  promotion?: boolean;
  description: string;
  note?: string;
  getSupportedTriggers?: () => string[];
  stage: VisualizationStage;

  appExtensions?: {
    visualizations: VisualizationsAppExtension;
    [appName: string]: unknown;
  };
}

let registry: VisTypeAlias[] = [];
const discardOnRegister: string[] = [];

interface VisTypeAliasRegistry {
  get: () => VisTypeAlias[];
  add: (newVisTypeAlias: VisTypeAlias) => void;
  remove: (visTypeAliasName: string) => void;
}

export const visTypeAliasRegistry: VisTypeAliasRegistry = {
  get: () => [...registry],
  add: (newVisTypeAlias) => {
    if (registry.find((visTypeAlias) => visTypeAlias.name === newVisTypeAlias.name)) {
      throw new Error(`${newVisTypeAlias.name} already registered`);
    }
    // if it exists on discardOnRegister array then we don't allow it to be registered
    const isToBeDiscarded = discardOnRegister.some(
      (aliasName) => aliasName === newVisTypeAlias.name
    );
    if (!isToBeDiscarded) {
      registry.push(newVisTypeAlias);
    }
  },
  remove: (visTypeAliasName) => {
    const isAliasPresent = registry.find((visTypeAlias) => visTypeAlias.name === visTypeAliasName);
    // in case the alias has not registered yet we store it on an array, in order to not allow it to
    // be registered in case of a race condition
    if (!isAliasPresent) {
      discardOnRegister.push(visTypeAliasName);
    } else {
      registry = registry.filter((visTypeAlias) => visTypeAlias.name !== visTypeAliasName);
    }
  },
};
