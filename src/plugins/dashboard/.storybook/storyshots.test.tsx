/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { ReactChildren } from 'react';
import path from 'path';
import moment from 'moment';
import 'moment-timezone';
import ReactDOM from 'react-dom';

import initStoryshots, { multiSnapshotWithOptions } from '@storybook/addon-storyshots';
// @ts-ignore
import styleSheetSerializer from 'jest-styled-components/src/styleSheetSerializer';
import { addSerializer } from 'jest-specific-snapshot';

// Set our default timezone to UTC for tests so we can generate predictable snapshots
moment.tz.setDefault('UTC');

// Freeze time for the tests for predictable snapshots
const testTime = new Date(Date.UTC(2019, 5, 1)); // June 1 2019
Date.now = jest.fn(() => testTime.getTime());

// Mock React Portal for components that use modals, tooltips, etc
// @ts-expect-error Portal mocks are notoriously difficult to type
ReactDOM.createPortal = jest.fn((element) => element);

// Mock EUI generated ids to be consistently predictable for snapshots.
jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

// Mock react-datepicker dep used by eui to avoid rendering the entire large component
jest.mock('@elastic/eui/packages/react-datepicker', () => {
  return {
    __esModule: true,
    default: 'ReactDatePicker',
  };
});

// Mock the EUI HTML ID Generator so elements have a predictable ID in snapshots
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

// To be resolved by EUI team.
// https://github.com/elastic/eui/issues/3712
jest.mock('@elastic/eui/lib/components/overlay_mask/overlay_mask', () => {
  return {
    EuiOverlayMask: ({ children }: { children: ReactChildren }) => children,
  };
});

// @ts-ignore
import { EuiObserver } from '@elastic/eui/test-env/components/observer/observer';
jest.mock('@elastic/eui/test-env/components/observer/observer');
EuiObserver.mockImplementation(() => 'EuiObserver');

// Some of the code requires that this directory exists, but the tests don't actually require any css to be present
const cssDir = path.resolve(__dirname, '../../../../built_assets/css');
if (!fs.existsSync(cssDir)) {
  fs.mkdirSync(cssDir, { recursive: true });
}

addSerializer(styleSheetSerializer);

// Initialize Storyshots and build the Jest Snapshots
initStoryshots({
  configPath: path.resolve(__dirname, './../.storybook'),
  framework: 'react',
  test: multiSnapshotWithOptions({}),
});
