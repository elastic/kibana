/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreStart } from '../../../../../core/public';
import type { EmbeddableInput } from '../../../../embeddable/common/types';
import type { IContainer } from '../../../../embeddable/public/lib/containers/i_container';
import type {
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../embeddable/public/lib/embeddables/i_embeddable';
import type { EmbeddableStart } from '../../../../embeddable/public/plugin';
import { toMountPoint } from '../../../../kibana_react/public/util/to_mount_point';
import { ReplacePanelFlyout } from './replace_panel_flyout';

export async function openReplacePanelFlyout(options: {
  embeddable: IContainer;
  core: CoreStart;
  savedObjectFinder: React.ComponentType<any>;
  notifications: CoreStart['notifications'];
  panelToRemove: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  getEmbeddableFactories: EmbeddableStart['getEmbeddableFactories'];
}) {
  const {
    embeddable,
    core,
    panelToRemove,
    savedObjectFinder,
    notifications,
    getEmbeddableFactories,
  } = options;
  const flyoutSession = core.overlays.openFlyout(
    toMountPoint(
      <ReplacePanelFlyout
        container={embeddable}
        onClose={() => {
          if (flyoutSession) {
            flyoutSession.close();
          }
        }}
        panelToRemove={panelToRemove}
        savedObjectsFinder={savedObjectFinder}
        notifications={notifications}
        getEmbeddableFactories={getEmbeddableFactories}
      />
    ),
    {
      'data-test-subj': 'dashboardReplacePanel',
      ownFocus: true,
    }
  );
}
