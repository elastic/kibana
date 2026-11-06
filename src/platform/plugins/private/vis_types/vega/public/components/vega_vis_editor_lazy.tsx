/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, type ComponentProps } from 'react';

import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import type { VisParams } from '../vega_fn';
import type { VegaSpecEditor } from './vega_vis_editor';

const VegaVisEditor = lazy(() => import('./vega_vis_editor'));

const LazyVegaSpecEditor = lazy(() =>
  import('./vega_vis_editor').then(({ VegaSpecEditor: SpecEditor }) => ({ default: SpecEditor }))
);

export type VegaSpecEditorProps = ComponentProps<typeof VegaSpecEditor>;

export const VegaVisEditorComponent = (props: VisEditorOptionsProps<VisParams>) => (
  <VegaVisEditor {...props} />
);

/** The HJSON/JSON spec editor with Vega's help and format menus; render it inside a `Suspense`. */
export const VegaSpecEditorComponent = (props: VegaSpecEditorProps) => (
  <LazyVegaSpecEditor {...props} />
);
