/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { EmbeddableStoryObj } from '@kbn/storybook';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { AnnotationsButton } from '../components/annotations_button';
import { createInMemoryAnnotationsApi } from '../lib/in_memory_api';
import type { Annotation, AnnotationsHostServices } from '../types';

const DEMO_PATH = '/app/demo';
const createdAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();

const seed: Annotation[] = [
  {
    id: 'annotation-1',
    createdAt,
    updatedAt: createdAt,
    author: { username: 'dana', displayName: 'Dana Designer' },
    text: 'This primary action competes with the page title. Could it move into the header actions?',
    resolved: false,
    replies: [
      {
        id: 'reply-1',
        author: { username: 'sam', displayName: 'Sam Engineer' },
        text: 'Agreed, moving it in the next iteration.',
        createdAt,
      },
    ],
    route: { pageKey: DEMO_PATH, path: DEMO_PATH },
    anchor: {
      locators: [{ type: 'testSubj', path: 'demoEditRuleButton' }],
      relativeX: 0.5,
      relativeY: 0.5,
    },
    trail: [],
  },
];

const paintPlaceholder = async (): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, window.innerWidth);
  canvas.height = Math.max(1, window.innerHeight);
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#e9edf3';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#69707d';
    context.font = '16px sans-serif';
    context.fillText('Storybook capture placeholder', 16, 32);
  }
  return canvas;
};

const createServices = (): AnnotationsHostServices => ({
  api: createInMemoryAnnotationsApi(seed),
  location: {
    getPageKey: () => DEMO_PATH,
    getPath: () => DEMO_PATH,
    subscribe: () => () => {},
  },
  navigateToPath: async (path) => action('navigateToPath')(path),
  getCurrentUser: async () => ({ username: 'demo' }),
  captureViewport: paintPlaceholder,
  ignoreSelectors: ['#demoHostBar'],
});

const DemoPage = () => {
  const { euiTheme } = useEuiTheme();
  const services = useMemo(createServices, []);

  return (
    <div style={{ position: 'relative', minHeight: 560, padding: 24 }}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>Demo rule</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill iconType="pencil" data-test-subj="demoEditRuleButton">
            Edit rule
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiPanel>
        <EuiText>
          <p>
            Switch on comment mode with the button in the bar below and click any element. The
            seeded comment sits on the “Edit rule” button.
          </p>
        </EuiText>
      </EuiPanel>

      <div
        id="demoHostBar"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: `0 ${euiTheme.size.m}`,
          background: euiTheme.colors.backgroundFilledPrimary,
          zIndex: euiTheme.levels.header,
        }}
      >
        <AnnotationsButton services={services} />
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'Annotations',
};

export default meta;

export const Default: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 600 } },
  render: () => <DemoPage />,
};
