/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { i18n } from '@kbn/i18n';

import { DefaultEditorSize } from '../../vis_default_editor/public';
import { getTimelionRequestHandler } from './helpers/timelion_request_handler';
import { TimelionOptionsProps } from './timelion_options';
import { TimelionVisDependencies } from './plugin';
import { toExpressionAst } from './to_ast';

import { VIS_EVENT_TO_TRIGGER } from '../../visualizations/public';

const TimelionOptions = lazy(() => import('./timelion_options'));

export const TIMELION_VIS_NAME = 'timelion';

export function getTimelionVisDefinition(dependencies: TimelionVisDependencies) {
  const timelionRequestHandler = getTimelionRequestHandler(dependencies);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return {
    name: TIMELION_VIS_NAME,
    title: 'Timelion',
    icon: 'visTimelion',
    description: i18n.translate('timelion.timelionDescription', {
      defaultMessage: 'Show time series data on a graph.',
    }),
    visConfig: {
      defaults: {
        expression: '.es(*)',
        interval: 'auto',
      },
    },
    editorConfig: {
      optionsTemplate: (props: TimelionOptionsProps) => (
        <TimelionOptions services={dependencies} {...props} />
      ),
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    requestHandler: timelionRequestHandler,
    toExpressionAst,
    responseHandler: 'none',
    inspectorAdapters: {},
    getSupportedTriggers: () => {
      return [VIS_EVENT_TO_TRIGGER.applyFilter];
    },
    options: {
      showIndexSelection: false,
      showQueryBar: false,
      showFilterBar: false,
    },
  };
}
