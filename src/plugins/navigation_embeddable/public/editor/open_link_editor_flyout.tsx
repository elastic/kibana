/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { coreServices } from '../services/kibana_services';
import { NavigationEmbeddableLinkList } from '../embeddable/types';
import { NavigationEmbeddableLinkEditor } from '../components/navigation_embeddable_link_editor';

export interface LinkEditorProps {
  idToEdit?: string;
  links: NavigationEmbeddableLinkList;
  parentDashboard?: DashboardContainer;
  ref: React.RefObject<HTMLDivElement>;
}

/**
 * @throws in case user cancels
 */
export async function openLinkEditorFlyout({
  ref,
  links,
  idToEdit,
  parentDashboard,
}: LinkEditorProps): Promise<NavigationEmbeddableLinkList> {
  return new Promise((resolve, reject) => {
    const onSave = (newLinks: NavigationEmbeddableLinkList) => {
      console.log('on save', newLinks);
      resolve(newLinks);
      if (ref.current) ReactDOM.unmountComponentAtNode(ref.current);
    };

    const onCancel = () => {
      if (ref.current) ReactDOM.unmountComponentAtNode(ref.current);
      reject();
    };

    ReactDOM.render(
      <KibanaThemeProvider theme$={coreServices.theme.theme$}>
        <NavigationEmbeddableLinkEditor
          links={links}
          onSave={onSave}
          onClose={onCancel}
          idToEdit={idToEdit}
          parentDashboard={parentDashboard}
        />
      </KibanaThemeProvider>,
      ref.current
    );
  });
}
