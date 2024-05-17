/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import React, { lazy } from 'react';
import { InputControlVisDependencies } from '../../plugin';
import { InputControlVisParams } from '../../types';

const ControlsTab = lazy(() => import('./controls_tab'));
const OptionsTab = lazy(() => import('./options_tab'));

export const getControlsTab =
  (deps: InputControlVisDependencies) => (props: VisEditorOptionsProps<InputControlVisParams>) => (
    <ControlsTab {...props} deps={deps} />
  );

export const OptionsTabLazy = (props: VisEditorOptionsProps<InputControlVisParams>) => (
  <OptionsTab {...props} />
);
