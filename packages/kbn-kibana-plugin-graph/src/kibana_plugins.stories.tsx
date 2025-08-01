/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { GraphVisualiser } from './graph_visualiser';

function Component() {
  return <GraphVisualiser />;
}

export default {
  component: Component,
  title: 'Kibana Plugin Graph List',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = () => <Component />;

const defaultProps = {};

export const KibanaPluginsGraph = Template.bind({});
KibanaPluginsGraph.args = defaultProps;
