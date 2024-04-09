/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedPanelState } from '@kbn/presentation-containers';
import { LinksAttributes } from '../../common/content_management';
import { checkForDuplicateTitle, linksClient } from '../content_management';
import { coreServices } from '../services/kibana_services';
import { LinksSerializedState } from './types';

export function intializeLibraryTransforms(
  attributes: Partial<LinksAttributes>,
  serializeState: () => SerializedPanelState<LinksSerializedState>,
  isByReference: boolean
) {
  return {
    canLinkToLibrary: async () => {
      const { visualize } = coreServices.application.capabilities;
      return visualize.save && !isByReference;
    },
    canUnlinkFromLibrary: async () => isByReference,
    saveToLibrary: async (title: string) => {
      const { rawState, references } = serializeState();
      const {
        item: { id },
      } = await linksClient.create({
        data: {
          ...(rawState?.attributes ?? {}),
          title,
        },
        options: { references },
      });
      return id;
    },
    getByValueState: () => {
      const { savedObjectId, ...byValueState } = serializeState().rawState ?? {};
      return {
        ...byValueState,
        attributes: {
          ...byValueState.attributes,
          ...attributes,
        },
      };
    },
    getByReferenceState: (libraryId: string) => {
      const { rawState } = serializeState();
      const { attributes: ignoredAttributes, ...byRefState } = rawState ?? {};
      return {
        ...byRefState,
        savedObjectId: libraryId,
      };
    },
    checkForDuplicateTitle: async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      await checkForDuplicateTitle({
        title: newTitle,
        copyOnSave: false,
        lastSavedTitle: '',
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      });
    },
  };
}
