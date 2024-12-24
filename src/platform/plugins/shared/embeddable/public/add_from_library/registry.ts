/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IconType } from '@elastic/eui';
import { CanAddNewPanel } from '@kbn/presentation-containers';
import { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedObjectMetaData } from '@kbn/saved-objects-finder-plugin/public';
import { useMemo } from 'react';

export type RegistryItem<TSavedObjectAttributes extends FinderAttributes = FinderAttributes> = {
  onAdd: (
    container: CanAddNewPanel,
    savedObject: SavedObjectCommon<TSavedObjectAttributes>
  ) => void;
  savedObjectMetaData: SavedObjectMetaData;
};

const registry: Map<string, RegistryItem<any>> = new Map();

export const registerAddFromLibraryType = <TSavedObjectAttributes extends FinderAttributes>({
  onAdd,
  savedObjectType,
  savedObjectName,
  getIconForSavedObject,
  getSavedObjectSubType,
  getTooltipForSavedObject,
}: {
  onAdd: RegistryItem['onAdd'];
  savedObjectType: string;
  savedObjectName: string;
  getIconForSavedObject: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => IconType;
  getSavedObjectSubType?: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => string;
  getTooltipForSavedObject?: (savedObject: SavedObjectCommon<TSavedObjectAttributes>) => string;
}) => {
  if (registry.has(savedObjectType)) {
    throw new Error(
      `Saved object type '${savedObjectType}' already exists in the 'Add from Library' registry.`
    );
  }

  registry.set(savedObjectType, {
    onAdd,
    savedObjectMetaData: {
      name: savedObjectName,
      type: savedObjectType,
      getIconForSavedObject,
      getTooltipForSavedObject,
      getSavedObjectSubType,
    },
  });
};

export function useAddFromLibraryTypes() {
  return useMemo(() => {
    return [...registry.entries()]
      .map(([type, registryItem]) => registryItem.savedObjectMetaData)
      .sort((a, b) => a.type.localeCompare(b.type));
  }, []);
}

export const getAddFromLibraryType = (type: string) => {
  return registry.get(type);
};
