/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { NavigationEmbeddableInput } from '../embeddable/types';
import { coreServices } from '../services/kibana_services';
import { NavigationEmbeddablePanelEditor } from '../components/navigation_embeddable_panel_editor';

/**
 * @throws in case user cancels
 */
export async function openCreateNewFlyout(
  initialInput?: Omit<NavigationEmbeddableInput, 'id'>,
  parentDashboard?: DashboardContainer
): Promise<Partial<NavigationEmbeddableInput>> {
  return new Promise((resolve, reject) => {
    const onSave = (containerInput: Partial<NavigationEmbeddableInput>) => {
      resolve(containerInput);
      editorFlyout.close();
    };

    const onCancel = () => {
      reject();
      editorFlyout.close();
    };

    const editorFlyout = coreServices.overlays.openFlyout(
      toMountPoint(
        <NavigationEmbeddablePanelEditor
          initialInput={{ id: uuidv4(), ...initialInput }}
          onClose={() => editorFlyout.close()}
          onSave={onSave}
          parentDashboard={parentDashboard}
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
