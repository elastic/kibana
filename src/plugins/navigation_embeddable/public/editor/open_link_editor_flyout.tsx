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
}: LinkEditorProps): Promise<NavigationEmbeddableLinkList | undefined> {
  const unmountFlyout = async () => {
    if (ref.current) {
      ref.current.children[1].className = 'navEmbeddableLinkEditor out';
    }
    await new Promise(() => {
      // wait for close animation before unmounting
      setTimeout(() => {
        if (ref.current) ReactDOM.unmountComponentAtNode(ref.current);
      }, 180);
    });
  };

  return new Promise<NavigationEmbeddableLinkList | undefined>((resolve, reject) => {
    const onSave = async (newLinks: NavigationEmbeddableLinkList) => {
      // console.log('on save', newLinks);
      resolve(newLinks);
      await unmountFlyout();
    };

    const onCancel = async () => {
      reject();
      await unmountFlyout();
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
  }).catch(() => {
    // on reject (i.e. on cancel), just return the original list of links
    return undefined;
  });
}
