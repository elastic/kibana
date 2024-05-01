/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCode, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
// @ts-ignore
import registerSearchEmbeddableSource from '!!raw-loader!../react_embeddables/search/register_search_embeddable';
// @ts-ignore
import registerAttachActionSource from '!!raw-loader!../react_embeddables/search/register_add_search_panel_action';
// @ts-ignore
import registerFieldListEmbeddableSource from '!!raw-loader!../react_embeddables/field_list/register_field_list_embeddable';
// @ts-ignore
import registerReactEmbeddableSavedObjectSource from '!!raw-loader!../react_embeddables/register_saved_object_example';

export const RegisterEmbeddable = () => {
  return (
    <>
      <EuiText>
        <h2>Register a new embeddable type</h2>
        <p>
          This plugin registers several embeddable types with{' '}
          <strong>registerReactEmbeddableFactory</strong> during plugin start. The code example
          below shows Search embeddable registration. Notice how the embeddable factory is imported
          asynchronously to limit initial page load size.
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
        <h2>Specify panel placement settings (optional)</h2>
        <p>
          Embeddable factories can specify placement settings for their embeddables. This is done by
          registering an embeddable type with a <em>getPanelPlacementSettings</em> function using{' '}
          <strong>registerDashboardPanelPlacementSetting</strong>. The{' '}
          <em>getPanelPlacementSettings</em> function that takes the serialized state of the
          embeddable and returns an object with optional width, height, and strategy properties. The
          width and height properties are numbers that specify the dimensions of the panel in the
          Dashboard where the max width is <EuiCode>48</EuiCode> and the max height is virtually
          unlimited. The strategy property is an enum that specifies the placement strategy to use.
          The example below shows how the Field List embeddable developer example specificies its
          placement settings on a Dashboard.
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerFieldListEmbeddableSource}
      </EuiCodeBlock>

      <EuiSpacer size="l" />

      <EuiText>
        <h2>Saved object embeddables</h2>
        <p>
          Embeddable factories, such as Lens, Maps, Links, that can reference saved objects should
          register their saved object types using{' '}
          <strong>registerReactEmbeddableSavedObject</strong>. The <em>Add from library</em> flyout
          on Dashboards uses this registry to list saved objects. The example function below could
          be called from the public start contract for a plugin.
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {registerReactEmbeddableSavedObjectSource}
      </EuiCodeBlock>
    </>
  );
};
