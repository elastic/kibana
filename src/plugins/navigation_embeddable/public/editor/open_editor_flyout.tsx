/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject } from 'rxjs';
import { memoize } from 'lodash';
import { skip, take, takeUntil } from 'rxjs/operators';

import { withSuspense } from '@kbn/shared-ux-utility';
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { coreServices } from '../services/kibana_services';
import { NavigationEmbeddableInput } from '../embeddable/types';
import { memoizedFetchDashboards } from '../components/dashboard_link/dashboard_link_tools';

const LazyNavigationEmbeddablePanelEditor = React.lazy(
  () => import('../components/navigation_embeddable_panel_editor')
);

const NavigationEmbeddablePanelEditor = withSuspense(
  LazyNavigationEmbeddablePanelEditor,
  <EuiPanel className="eui-textCenter">
    <EuiLoadingSpinner size="l" />
  </EuiPanel>
);

/**
 * @throws in case user cancels
 */
export async function openEditorFlyout(
  initialInput?: Omit<NavigationEmbeddableInput, 'id'>,
  parentDashboard?: DashboardContainer
): Promise<Partial<NavigationEmbeddableInput>> {
  return new Promise((resolve, reject) => {
    const closed$ = new Subject<true>();

    const onSave = (partialInput: Partial<NavigationEmbeddableInput>) => {
      resolve(partialInput);
      editorFlyout.close();
    };

    const onCancel = () => {
      reject();
      editorFlyout.close();
    };

    // Close the flyout whenever the breadcrumbs change - i.e. when the dashboard's title changes, or when
    // the user navigates away from the given dashboard (to the listing page **or** to another app), etc.
    coreServices.chrome
      .getBreadcrumbs$()
      .pipe(takeUntil(closed$), skip(1), take(1))
      .subscribe(() => {
        editorFlyout.close();
      });

    const editorFlyout = coreServices.overlays.openFlyout(
      toMountPoint(
        <NavigationEmbeddablePanelEditor
          initialInput={initialInput ?? {}}
          onClose={onCancel}
          onSave={onSave}
          parentDashboard={parentDashboard}
        />,
        { theme$: coreServices.theme.theme$ }
      ),
      {
        ownFocus: true,
        outsideClickCloses: false,
        onClose: onCancel,
      }
    );

    editorFlyout.onClose.then(() => {
      // we should always re-fetch the dashboards when the editor is opened; so, clear the cache on close
      memoizedFetchDashboards.cache = new memoize.Cache();
      closed$.next(true);
    });
  });
}
