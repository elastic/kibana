/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

import { coreServices } from '../services/kibana_services';
import { LinkEditor } from '../components/editor/link_editor';
import { focusMainFlyout } from './links_editor_tools';
import { ResolvedLink } from '../react_embeddable/types';

export interface LinksEditorProps {
  link?: ResolvedLink;
  parentDashboardId?: string;
  mainFlyoutId: string;
  ref: React.RefObject<HTMLDivElement>;
}

/**
 * This editor has no context about other links, so it cannot determine order; order will be determined
 * by the **caller** (i.e. the panel editor, which contains the context about **all links**)
 */
export type UnorderedLink = Omit<ResolvedLink, 'order'>;

/**
 * @throws in case user cancels
 */
export async function openLinkEditorFlyout({
  ref,
  link,
  mainFlyoutId, // used to manage the focus of this flyout after inidividual link editor flyout is closed
  parentDashboardId,
}: LinksEditorProps) {
  const unmountFlyout = async () => {
    if (ref.current) {
      ref.current.children[1].className = 'linkEditor out';
    }
    await new Promise(() => {
      // wait for close animation before unmounting
      setTimeout(() => {
        if (ref.current) ReactDOM.unmountComponentAtNode(ref.current);
        focusMainFlyout(mainFlyoutId);
      }, 180);
    });
  };

  return new Promise<UnorderedLink | undefined>((resolve, reject) => {
    const onSave = async (newLink: UnorderedLink) => {
      resolve(newLink);
      await unmountFlyout();
    };

    const onCancel = async () => {
      reject();
      await unmountFlyout();
    };

    ReactDOM.render(
      <KibanaThemeProvider theme={coreServices.theme}>
        <LinkEditor
          link={link}
          onSave={onSave}
          onClose={onCancel}
          parentDashboardId={parentDashboardId}
        />
      </KibanaThemeProvider>,
      ref.current
    );
  }).catch(() => {
    // on reject (i.e. on cancel), just return the original list of links
    return undefined;
  });
}
