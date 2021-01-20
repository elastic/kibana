/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { InputControlVisDependencies } from '../../plugin';
import { InputControlVisParams } from '../../types';

const ControlsTab = lazy(() => import('./controls_tab'));
const OptionsTab = lazy(() => import('./options_tab'));

export const getControlsTab = (deps: InputControlVisDependencies) => (
  props: VisOptionsProps<InputControlVisParams>
) => <ControlsTab {...props} deps={deps} />;

export const OptionsTabLazy = (props: VisOptionsProps<InputControlVisParams>) => (
  <OptionsTab {...props} />
);
