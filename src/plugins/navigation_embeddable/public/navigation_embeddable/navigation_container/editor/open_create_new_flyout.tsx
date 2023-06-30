/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { coreServices } from '../../services/kibana_services';
import { NavigationEmbeddableEditor } from '../components/navigation_embeddable_editor';
import { NavigationContainerInput } from '../../types';
import { DashboardLinkInput } from '../../dashboard_link/types';
import { ExternalLinkInput } from '../../external_link/types';

/**
 * @throws in case user cancels
 */
export async function openCreateNewFlyout(
  initialInput?: Omit<NavigationContainerInput, 'id'>,
  currentDashboardId?: string
): Promise<Partial<NavigationContainerInput>> {
  return new Promise((resolve, reject) => {
    const onSave = (containerInput: Partial<NavigationContainerInput>) => {
      resolve(containerInput);
      editorFlyout.close();
    };

    const onCancel = () => {
      reject();
      editorFlyout.close();
    };

    const editorFlyout = coreServices.overlays.openFlyout(
      toMountPoint(
        <NavigationEmbeddableEditor
          initialInput={{ id: uuidv4(), ...initialInput }}
          onClose={() => editorFlyout.close()}
          onSave={onSave}
          currentDashboardId={currentDashboardId}
        />,
        { theme$: coreServices.theme.theme$ }
      ),
      {
        outsideClickCloses: false,
        onClose: () => {
          onCancel();
        },
      }
    );
  });
}
