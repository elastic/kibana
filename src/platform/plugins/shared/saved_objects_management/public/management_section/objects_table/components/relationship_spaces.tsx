/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/core-spaces-common';
import type { SavedObjectRelation } from '../../../types';

const ALL_SPACES_ID = '*';

const staleRelationTitle = i18n.translate(
  'savedObjectsManagement.objectsTable.relationships.spaces.staleTitle',
  { defaultMessage: 'Possibly stale reference' }
);

const staleRelationContent = i18n.translate(
  'savedObjectsManagement.objectsTable.relationships.spaces.staleContent',
  {
    defaultMessage:
      'This object references the saved object, but it is no longer shared into this space.',
  }
);

/** Whether a related object's reference points at an object that isn't (or is no longer) shared into any of the spaces the related object lives in. */
export const isStaleRelation = (
  relationNamespaces: string[] | undefined,
  targetNamespaces: string[] | undefined
): boolean => {
  if (!relationNamespaces?.length || !targetNamespaces?.length) {
    return false;
  }
  if (relationNamespaces.includes(ALL_SPACES_ID) || targetNamespaces.includes(ALL_SPACES_ID)) {
    return false;
  }
  return !relationNamespaces.some((namespace) => targetNamespaces.includes(namespace));
};

const getActiveSpaceId = (basePath: IBasePath): string =>
  getSpaceIdFromPath(basePath.get(), basePath.serverBasePath).spaceId;

/** Picks which space a related object's "open in app" link should point at. */
const getLinkSpaceId = (
  relationNamespaces: string[] | undefined,
  activeSpaceId: string
): string => {
  if (!relationNamespaces?.length || relationNamespaces.includes(activeSpaceId)) {
    return activeSpaceId;
  }
  const specificNamespace = relationNamespaces.find((namespace) => namespace !== ALL_SPACES_ID);
  return specificNamespace ?? activeSpaceId;
};

export const getRelationshipHref = (
  basePath: IBasePath,
  relationNamespaces: string[] | undefined,
  path: string
): string => {
  const activeSpaceId = getActiveSpaceId(basePath);
  const linkSpaceId = getLinkSpaceId(relationNamespaces, activeSpaceId);
  return addSpaceIdToPath(basePath.serverBasePath, linkSpaceId, path);
};

/** Whether the Spaces column is worth showing: only when some relation lives outside the current space. */
export const shouldShowSpacesColumn = (
  spacesApi: SpacesApi | undefined,
  relations: SavedObjectRelation[],
  basePath: IBasePath
): boolean => {
  if (!spacesApi) {
    return false;
  }
  const activeSpaceId = getActiveSpaceId(basePath);
  return relations.some(
    (relation) =>
      relation.namespaces?.includes(ALL_SPACES_ID) ||
      relation.namespaces?.some((namespace) => namespace !== activeSpaceId)
  );
};

/**
 * `LazySpaceList` reads its data from a `SpacesContextProvider` in React context (via `useSpaces()`);
 * without one, it throws trying to use an undefined `spacesDataPromise`. Wrap any tree that renders
 * `RelationshipSpacesCell` with this so it works regardless of whether the caller already set one up.
 */
export const SpacesContextWrapper = ({
  spacesApi,
  children,
}: PropsWithChildren<{ spacesApi: SpacesApi | undefined }>) => {
  if (!spacesApi) {
    return <>{children}</>;
  }
  const Provider = spacesApi.ui.components.getSpacesContextProvider;
  return <Provider>{children}</Provider>;
};

export const RelationshipSpacesCell = ({
  spacesApi,
  namespaces,
  targetNamespaces,
}: {
  spacesApi: SpacesApi;
  namespaces: string[] | undefined;
  targetNamespaces: string[] | undefined;
}) => {
  const LazySpaceList = spacesApi.ui.components.getSpaceList;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <LazySpaceList namespaces={namespaces ?? []} behaviorContext="outside-space" />
      </EuiFlexItem>
      {isStaleRelation(namespaces, targetNamespaces) && (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="warning"
            color="warning"
            title={staleRelationTitle}
            content={staleRelationContent}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
