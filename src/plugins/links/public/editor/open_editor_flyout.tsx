/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject } from 'rxjs';
import { skip, take, takeUntil } from 'rxjs/operators';

import { withSuspense } from '@kbn/shared-ux-utility';
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { LinksInput, LinksByReferenceInput, LinksEditorFlyoutReturn } from '../embeddable/types';
import { coreServices } from '../services/kibana_services';
import { runSaveToLibrary } from '../content_management/save_to_library';
import { Link, LinksLayoutType } from '../../common/content_management';
import { getLinksAttributeService } from '../services/attribute_service';

const LazyLinksEditor = React.lazy(() => import('../components/editor/links_editor'));

const LinksEditor = withSuspense(
  LazyLinksEditor,
  <EuiPanel className="eui-textCenter">
    <EuiLoadingSpinner size="l" />
  </EuiPanel>
);

/**
 * @throws in case user cancels
 */
export async function openEditorFlyout(
  initialInput: LinksInput,
  parentDashboard?: DashboardContainer
): Promise<LinksEditorFlyoutReturn> {
  const attributeService = getLinksAttributeService();
  const { attributes } = await attributeService.unwrapAttributes(initialInput);
  const isByReference = attributeService.inputIsRefType(initialInput);

  return new Promise((resolve, reject) => {
    const closed$ = new Subject<true>();

    const onSaveToLibrary = async (newLinks: Link[], newLayout: LinksLayoutType) => {
      const newAttributes = {
        ...attributes,
        links: newLinks,
        layout: newLayout,
      };
      const updatedInput = (initialInput as LinksByReferenceInput).savedObjectId
        ? await attributeService.wrapAttributes(newAttributes, true, initialInput)
        : await runSaveToLibrary(newAttributes, initialInput);
      if (!updatedInput) {
        return;
      }
      resolve({
        newInput: updatedInput,

        // pass attributes via attributes so that the Dashboard can choose the right panel size.
        attributes: newAttributes,
      });
      parentDashboard?.reload();
      editorFlyout.close();
    };

    const onAddToDashboard = (newLinks: Link[], newLayout: LinksLayoutType) => {
      const newAttributes = {
        ...attributes,
        links: newLinks,
        layout: newLayout,
      };
      const newInput: LinksInput = {
        ...initialInput,
        attributes: newAttributes,
      };
      resolve({
        newInput,

        // pass attributes so that the Dashboard can choose the right panel size.
        attributes: newAttributes,
      });
      parentDashboard?.reload();
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
        <LinksEditor
          initialLinks={attributes?.links}
          initialLayout={attributes?.layout}
          onClose={onCancel}
          onSaveToLibrary={onSaveToLibrary}
          onAddToDashboard={onAddToDashboard}
          parentDashboard={parentDashboard}
          isByReference={isByReference}
        />,
        { theme$: coreServices.theme.theme$ }
      ),
      {
        ownFocus: true,
        outsideClickCloses: false,
        onClose: onCancel,
        className: 'linksPanelEditor',
        'data-test-subj': 'links--panelEditor--flyout',
      }
    );

    editorFlyout.onClose.then(() => {
      closed$.next(true);
    });
  });
}
