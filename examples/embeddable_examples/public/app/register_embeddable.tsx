/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
// @ts-ignore
import registerSearchEmbeddableSource from '../react_embeddables/search/register_search_embeddable?raw';
// @ts-ignore
import registerAttachActionSource from '../react_embeddables/search/register_add_search_panel_action?raw';
// @ts-ignore
import registerFieldListEmbeddableSource from '../react_embeddables/field_list/register_field_list_embeddable?raw';
// @ts-ignore
import registerReactEmbeddableSavedObjectSource from '../react_embeddables/register_saved_object_example?raw';

export const RegisterEmbeddable = () => {
  return (
    <>
      <EuiText>
        <h2>Register a new embeddable type</h2>
        <p>
          This plugin registers several embeddable types with{' '}
          <strong>registerReactEmbeddableFactory</strong>. The code example below shows Search
          embeddable registration. The embeddable factory is imported asynchronously to limit
          initial page load size.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerSearchEmbeddableSource}
      </EuiCodeBlock>

      <EuiSpacer size="l" />

      <EuiText>
        <p>
          Run the example embeddables by creating a dashboard, clicking <em>Add panel</em> button,
          and then selecting <em>Embeddable examples</em> group.
        </p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiText>
        <h2>Show embeddables in the Add panel menu</h2>
        <p>
          Add your own embeddables to <em>Add panel</em> menu by attaching an action to the{' '}
          <strong>ADD_PANEL_TRIGGER</strong> trigger. Notice usage of <strong>grouping</strong> to
          nest related panel types and avoid bloating <em>Add panel</em> menu. Please reach out to
          @elastic/kibana-presentation team to coordinate menu updates.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerAttachActionSource}
      </EuiCodeBlock>

      <EuiSpacer size="l" />

      <EuiText>
        <h2>Configure initial dashboard placement (optional)</h2>
        <p>
          Add an entry to <strong>registerDashboardPanelPlacementSetting</strong> provided by the
          Dashboard plugin start contract to configure initial dashboard placement. Panel placement
          lets you configure the width, height, and placement strategy when panels get added to a
          dashboard. In the example below, the Field List embeddable will be added to dashboards as
          a narrow and tall panel.
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerFieldListEmbeddableSource}
      </EuiCodeBlock>

      <EuiSpacer size="l" />

      <EuiText>
        <h2>
          Show saved object type in <em>Add from library</em> menu
        </h2>
        <p>
          Embeddable factories, such as Lens, Maps, Links, that can reference saved objects should
          register their saved object types using <strong>registerAddFromLibraryType</strong>. The{' '}
          <em>Add from library</em> flyout on Dashboards uses this registry to list saved objects.
          The example function below could be called from the public start contract for a plugin.
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerReactEmbeddableSavedObjectSource}
      </EuiCodeBlock>
    </>
  );
};
