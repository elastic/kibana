/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Story } from '@storybook/react';

const bar = '#c5ced8';
const panel = '#ffff';
const background = '#FAFBFD';
const minHeight = 60;

const panelStyle = {
  height: 165,
  width: 400,
  background: panel,
};

const kqlBarStyle = { background: bar, padding: 16, minHeight, fontStyle: 'italic' };

const layout = (OptionStory: Story) => (
  <EuiFlexGroup style={{ background }} direction="column">
    <EuiFlexItem style={kqlBarStyle}>KQL Bar</EuiFlexItem>
    <EuiFlexItem>
      <OptionStory />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFlexGroup>
        <EuiFlexItem style={panelStyle} />
        <EuiFlexItem style={panelStyle} />
        <EuiFlexItem style={panelStyle} />
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFlexGroup>
        <EuiFlexItem style={panelStyle} />
        <EuiFlexItem style={panelStyle} />
        <EuiFlexItem style={panelStyle} />
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const decorators = [layout];
