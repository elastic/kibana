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
import { NavigationEmbeddableLink } from '../embeddable/types';
import { NavigationEmbeddableLinkEditor } from '../components/navigation_embeddable_link_editor';

export interface LinkEditorProps {
  link?: NavigationEmbeddableLink;
  parentDashboard?: DashboardContainer;
  ref: React.RefObject<HTMLDivElement>;
}

/**
 * This editor has no context about other links, so it cannot determine order; order will be determined
 * by the **caller** (i.e. the panel editor, which contains the context about **all links**)
 */
export type NavigationEmbeddableUnorderedLink = Omit<NavigationEmbeddableLink, 'order'>;

/**
 * @throws in case user cancels
 */
export async function openLinkEditorFlyout({
  ref,
  link,
  parentDashboard,
}: LinkEditorProps): Promise<NavigationEmbeddableUnorderedLink | undefined> {
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

  return new Promise<NavigationEmbeddableUnorderedLink | undefined>((resolve, reject) => {
    const onSave = async (newLink: NavigationEmbeddableUnorderedLink) => {
      resolve(newLink);
      await unmountFlyout();
    };

    const onCancel = async () => {
      reject();
      await unmountFlyout();
    };

    ReactDOM.render(
      <KibanaThemeProvider theme$={coreServices.theme.theme$}>
        <NavigationEmbeddableLinkEditor
          link={link}
          onSave={onSave}
          onClose={onCancel}
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
