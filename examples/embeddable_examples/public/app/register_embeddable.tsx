/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';

export const RegisterEmbeddable = () => {
  return (
    <>
      <EuiText>
        <p>
          This plugin registers several embeddable types with{' '}
          <strong>registerReactEmbeddableFactory</strong> during plugin start. The code example
          below shows Markdown embeddable registration. Notice how the embeddable factory is
          imported asynchronously to limit initial page load size.
        </p>
      </EuiText>

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {`registerReactEmbeddableFactory(EUI_MARKDOWN_ID, async () => {
  const { markdownEmbeddableFactory } = await import(
    './react_embeddables/eui_markdown/eui_markdown_react_embeddable'
  );
  return markdownEmbeddableFactory;
});`}
      </EuiCodeBlock>

      <EuiSpacer size="l" />

      <EuiText>
        <p>
          Run the example embeddables by creating a dashboard, clicking <em>Add panel</em> button,
          and then selecting <em>Embeddable examples</em> group.
        </p>
        <p>
          Add your own embeddables to <em>Add panel</em> menu by attaching an action to the{' '}
          <strong>ADD_PANEL_TRIGGER</strong> trigger. Notice usage of <strong>grouping</strong>
          to nest related panel types and avoid bloating <em>Add panel</em> menu. Please reach out
          to @elastic/kibana-presentation team to coordinate menu updates.
        </p>
      </EuiText>

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {`uiActions.registerAction<EmbeddableApiContext>({
  id: ADD_EUI_MARKDOWN_ACTION_ID,
  grouping: [
    {
      id: 'embeddableExamples',
      getDisplayName: () => 'Embeddable examples',
    }
  ],
  getIconType: () => 'editorCodeBlock',
  isCompatible: async ({ embeddable }) => {
    return apiCanAddNewPanel(embeddable);
  },
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel(
      {
        panelType: EUI_MARKDOWN_ID,
        initialState: { content: '# hello world!' },
      },
      true
    );
  },
  getDisplayName: () => 'EUI Markdown',
});
uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_EUI_MARKDOWN_ACTION_ID);`}
      </EuiCodeBlock>
    </>
  );
};
