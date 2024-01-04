/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { ShareToSpaceSavedObjectTarget, SpacesManager } from '@kbn/spaces-plugin/public';

export const canSaveToSharedObject = async ({
  savedObjectTarget,
  references,
  spacesManager,
}: {
  savedObjectTarget: ShareToSpaceSavedObjectTarget;
  references: Reference[];
  spacesManager: SpacesManager;
}): Promise<boolean> => {
  if (references.length === 0) return true;

  const { id, type, namespaces } = savedObjectTarget;
  const hasHiddenSpace = namespaces.includes('?');
  const sharedWithAllSpaces = namespaces.includes('*');

  const shareableReferences = (
    await spacesManager.getShareableReferences([{ type, id }, ...references])
  ).objects;

  const hasUnsharedReference = references.some(({ id: refId }) => {
    const shareableRef = shareableReferences.find(
      ({ id: shareableRefId }: { id: string }) => refId === shareableRefId
    );

    if (!shareableRef) return true;

    return namespaces.some((sharedSpace) => !shareableRef.spaces.includes(sharedSpace));
  });

  if (!hasUnsharedReference) return true;

  if (hasHiddenSpace) return false;

  const hasUnshareableReference = shareableReferences.some(({ spaces }) => spaces.length === 0);

  if (hasUnshareableReference) return false;

  const allSpaces = sharedWithAllSpaces
    ? await (await spacesManager.getSpaces()).map(({ id: spaceId }) => spaceId)
    : namespaces;
  const shareableSpaces = await spacesManager.getSpaces({
    purpose: 'shareSavedObjectsIntoSpace',
  });

  const cannotShareToAllSpaces = allSpaces.some(
    (spaceId) =>
      !shareableSpaces.find(({ id: shareEnabledSpaceId }) => spaceId === shareEnabledSpaceId)
  );

  return !cannotShareToAllSpaces;
};
