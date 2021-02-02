/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface ExpressionRenderDefinition<Config = unknown> {
  /**
   * Technical name of the renderer, used as ID to identify renderer in
   * expression renderer registry. This must match the name of the expression
   * function that is used to create the `type: render` object.
   */
  name: string;

  /**
   * A user friendly name of the renderer as will be displayed to user in UI.
   */
  displayName?: string;

  /**
   * Help text as will be displayed to user. A sentence or few about what this
   * element does.
   */
  help?: string;

  /**
   * Used to validate the data before calling the render function.
   */
  validate?: () => undefined | Error;

  /**
   * Tell the renderer if the dom node should be reused, it's recreated each
   * time by default.
   */
  reuseDomNode: boolean;

  /**
   * The function called to render the output data of an expression.
   */
  render: (
    domNode: HTMLElement,
    config: Config,
    handlers: IInterpreterRenderHandlers
  ) => void | Promise<void>;
}

export type AnyExpressionRenderDefinition = ExpressionRenderDefinition<any>;

/**
 * Mode of the expression render environment.
 * This value can be set from a consumer embedding an expression renderer and is accessible
 * from within the active render function as part of the handlers.
 * The following modes are supported:
 * * display (default): The chart is rendered in a container with the main purpose of viewing the chart (e.g. in a container like dashboard or canvas)
 * * preview: The chart is rendered in very restricted space (below 100px width and height) and should only show a rough outline
 * * edit: The chart is rendered within an editor and configuration elements within the chart should be displayed
 * * noInteractivity: The chart is rendered in a non-interactive environment and should not provide any affordances for interaction like brushing
 */
export type RenderMode = 'noInteractivity' | 'edit' | 'preview' | 'display';

export interface IInterpreterRenderHandlers {
  /**
   * Done increments the number of rendering successes
   */
  done: () => void;
  onDestroy: (fn: () => void) => void;
  reload: () => void;
  update: (params: any) => void;
  event: (event: any) => void;
  hasCompatibleActions?: (event: any) => Promise<boolean>;
  getRenderMode: () => RenderMode;
  isSyncColorsEnabled: () => boolean;
  /**
   * This uiState interface is actually `PersistedState` from the visualizations plugin,
   * but expressions cannot know about vis or it creates a mess of circular dependencies.
   * Downstream consumers of the uiState handler will need to cast for now.
   */
  uiState?: unknown;
}
