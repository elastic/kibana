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
          registering placement settings with <strong>registerEmbeddablePlacementStrategy</strong>.
          The placement settings is a function that takes the serialized state of the embeddable and
          returns an object with width, height, and strategy properties. The width and height
          properties are numbers that specify the relative dimensions of the embeddable panel. For
          example, a DashboardContainer uses <em>grid units</em> where the maximum width is{' '}
          <EuiCode>48</EuiCode> and the max height is virtually unlimited. The strategy property is
          a string that specifies the placement strategy to use. Strategies are specific to the
          consumer. For example, DashboardContainer currently supports the{' '}
          <EuiCode>placeAtTop</EuiCode> and
          <EuiCode>findTopLeftMostOpenSpace</EuiCode> strategies. The example below shows how the
          Field List embeddable developer example specificies its placement settings on a Dashboard.
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
          on Dashboards uses this registry to list saved objects. The example below could be added
          to the public start contract for a plugin.
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
        {`
registerReactEmbeddableSavedObject({
  onAdd: (container, savedObject) => {
    container.addNewPanel({
    panelType: MY_EMBEDDABLE_TYPE,
    initialState: savedObject.attributes,
  });
},
  embeddableType: MY_EMBEDDABLE_TYPE,
  savedObjectType: MY_SAVED_OBJECT_TYPE,
  savedObjectName: 'Some saved object',
  getIconForSavedObject: () => APP_ICON,
});`}
      </EuiCodeBlock>
    </>
  );
};
