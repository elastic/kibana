/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
// @ts-ignore
import registerSearchEmbeddableSource from '!!raw-loader!../react_embeddables/search/register_search_embeddable';
// @ts-ignore
import registerAttachActionSource from '!!raw-loader!../react_embeddables/search/register_add_search_panel_action';

export const RegisterEmbeddable = () => {
  return (
    <>
      <EuiText>
        <p>
          This plugin registers several embeddable types with{' '}
          <strong>registerReactEmbeddableFactory</strong> during plugin start. The code example
          below shows Search embeddable registration. Notice how the embeddable factory is imported
          asynchronously to limit initial page load size.
        </p>
      </EuiText>

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerSearchEmbeddableSource}
      </EuiCodeBlock>

      <EuiSpacer size="l" />

      <EuiText>
        <p>
          Run the example embeddables by creating a dashboard, clicking <em>Add panel</em> button,
          and then selecting <em>Embeddable examples</em> group.
        </p>
        <p>
          Add your own embeddables to <em>Add panel</em> menu by attaching an action to the{' '}
          <strong>ADD_PANEL_TRIGGER</strong> trigger. Notice usage of <strong>grouping</strong> to
          nest related panel types and avoid bloating <em>Add panel</em> menu. Please reach out to
          @elastic/kibana-presentation team to coordinate menu updates.
        </p>
      </EuiText>

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerAttachActionSource}
      </EuiCodeBlock>
    </>
  );
};
