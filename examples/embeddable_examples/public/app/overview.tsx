/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiMarkdownFormat } from '@elastic/eui';
// @ts-ignore
import overviewMarkdown from '!!raw-loader!@kbn/embeddable-plugin/README.md';

import { EuiText } from '@elastic/eui';

export const Overview = () => {
  return (
    <EuiText>
      <p>
        Embeddables are React components that manage their own state, can be serialized and
        deserialized, and return an API that can be used to interact with them imperatively.
      </p>

      <EuiMarkdownFormat>
        {overviewMarkdown}
      </EuiMarkdownFormat>

      <h3>Guiding principles</h3>
      <ul>
        <li>
          <strong>Coupled to React</strong>
          Kibana is a React application, and the minimum unit of sharing is the React component. Embeddables enforce this by requiring a React component.
        </li>
        <li>
          <strong>Composition over inheritence</strong>
          Rather than an inheritance-based system with classes, imperative APIs are plain old typescript objects that implement any number of shared interfaces.
          Interfaces are enforced via type guards and are shared via Packages.
        </li>
        <li>
          <strong>Internal state management</strong>
        </li>
        <li>
          <strong>Minimal API surface area</strong>
        </li>
      </ul>

      <h3>Managing state</h3>

      <h3>Imperative API</h3>

      <h3>Embeddable vs React component</h3>
      Prefer React components. Only use Embeddables if your component should be rendered on Dashboard

      <h3>Rendering non-react embeddable</h3>
    </EuiText>
  );
};
