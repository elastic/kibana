/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LinksParentApi, LinksSerializedState } from '../types';
import { CONTENT_ID } from '../../common';
import { serializeLinksAttributes } from '../lib/serialize_attributes';
import { getEditorFlyout } from '../editor/get_editor_flyout';

export const loadLinksFlyout = async ({
  embeddable,
  closeFlyout,
  ariaLabelledBy,
}: {
  embeddable: LinksParentApi;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}) => {
  return await getEditorFlyout({
    closeFlyout,
    ariaLabelledBy,
    parentDashboard: embeddable,
    onSave: async (runtimeState) => {
      if (!runtimeState) return;

      function serializeState() {
        if (!runtimeState) return;

        if (runtimeState.savedObjectId !== undefined) {
          return {
            rawState: {
              savedObjectId: runtimeState.savedObjectId,
            },
          };
        }

        const { attributes, references } = serializeLinksAttributes(runtimeState);
        return { rawState: { attributes }, references };
      }

      await embeddable.addNewPanel<LinksSerializedState>({
        panelType: CONTENT_ID,
        serializedState: serializeState(),
      });
    },
  });
};
