/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
// @ts-ignore
import { ExprVis } from './vis';
import { Visualization } from '../components';
import { VisParams } from '../types';

export const visualization = () => ({
  name: 'visualization',
  displayName: 'visualization',
  reuseDomNode: true,
  render: async (domNode: HTMLElement, config: any, handlers: any) => {
    const { visData, visConfig, params } = config;
    const visType = config.visType || visConfig.type;

    const vis = new ExprVis({
      title: config.title,
      type: visType as string,
      params: visConfig as VisParams,
    });

    vis.eventsSubject = { next: handlers.event };

    const uiState = handlers.uiState || vis.getUiState();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const listenOnChange = params ? params.listenOnChange : false;
    render(
      <Visualization
        vis={vis}
        visData={visData}
        visParams={vis.params}
        uiState={uiState}
        listenOnChange={listenOnChange}
        onInit={handlers.done}
      />,
      domNode
    );
  },
});
