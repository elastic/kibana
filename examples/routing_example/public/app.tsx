/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters } from '@kbn/core/public';
import {
  EuiPageTemplate,
  EuiPageSection,
  EuiText,
  EuiHorizontalRule,
  EuiListGroup,
} from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
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
  startServices,
}: Props) {
  return (
    <KibanaRenderContextProvider {...startServices}>
      <EuiPageTemplate>
        <EuiPageTemplate.Header>
          <EuiText>
            <h1>Routing examples</h1>
          </EuiText>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <EuiPageSection>
            <EuiText>
              <EuiListGroup
                listItems={[
                  {
                    label: 'IRouter API docs',
                    href: 'https://docs.elastic.dev/kibana-dev-docs/api/kbn-core-http-server#:~:text=IRouter',
                    iconType: 'logoGithub',
                    target: '_blank',
                    size: 's',
                  },
                  {
                    label: 'HttpHandler (core.http.fetch) API docs',
                    href: 'https://docs.elastic.dev/kibana-dev-docs/api/kbn-core-http-browser#:~:text=HttpHandler',
                    iconType: 'logoGithub',
                    target: '_blank',
                    size: 's',
                  },
                  {
                    label: 'Conventions',
                    href: 'https://github.com/elastic/kibana/blob/main/STYLEGUIDE.mdx#api-endpoints',
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
          </EuiPageSection>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </KibanaRenderContextProvider>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<RoutingExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
