/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters } from 'kibana/public';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiText,
  EuiHorizontalRule,
  EuiPageContentHeader,
  EuiListGroup,
} from '@elastic/eui';
import { RandomNumberRouteExample } from './random_number_example';
import { RandomNumberBetweenRouteExample } from './random_number_between_example';
import { Services } from './services';
import { PostMessageRouteExample } from './post_message_example';
import { GetMessageRouteExample } from './get_message_example';

type Props = Services;

function RoutingExplorer({
  fetchRandomNumber,
  fetchRandomNumberBetween,
  addSuccessToast,
  postMessage,
  getMessageById,
}: Props) {
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiText>
              <h1>Routing examples</h1>
            </EuiText>
          </EuiPageContentHeader>
          <EuiText>
            <EuiListGroup
              listItems={[
                {
                  label: 'IRouter API docs',
                  href: 'https://github.com/elastic/kibana/blob/main/docs/development/core/server/kibana-plugin-core-server.irouter.md',
                  iconType: 'logoGithub',
                  target: '_blank',
                  size: 's',
                },
                {
                  label: 'HttpHandler (core.http.fetch) API docs',
                  href: 'https://github.com/elastic/kibana/blob/main/docs/development/core/public/kibana-plugin-core-public.httphandler.md',
                  iconType: 'logoGithub',
                  target: '_blank',
                  size: 's',
                },
                {
                  label: 'Conventions',
                  href: 'https://github.com/elastic/kibana/tree/main/STYLEGUIDE.mdx#api-endpoints',
                  iconType: 'logoGithub',
                  target: '_blank',
                  size: 's',
                },
              ]}
            />
          </EuiText>
          <EuiHorizontalRule />
          <RandomNumberRouteExample fetchRandomNumber={fetchRandomNumber} />
          <EuiHorizontalRule />
          <RandomNumberBetweenRouteExample fetchRandomNumberBetween={fetchRandomNumberBetween} />

          <EuiHorizontalRule />
          <PostMessageRouteExample addSuccessToast={addSuccessToast} postMessage={postMessage} />

          <EuiHorizontalRule />
          <GetMessageRouteExample getMessageById={getMessageById} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<RoutingExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
