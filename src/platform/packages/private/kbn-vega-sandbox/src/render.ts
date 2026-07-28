/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { View, expressionFunction, loader, logger, parse, Warn } from 'vega';
import { expressionInterpreter } from 'vega-interpreter';
import {
  VEGA_SANDBOX_RENDER_FUNCTIONS,
  VegaSandboxErrorCode,
  VegaSandboxWarningCode,
} from './common';
import { TooltipHandler } from './tooltip';
import type {
  VegaSandboxRenderCallbacks,
  VegaSandboxRenderController,
  VegaSandboxRenderIntent,
  VegaSandboxRenderParams,
} from './types';

interface ViewWithSandboxHandler extends View {
  _kbnVegaSandboxFunctionHandler?: (intent: VegaSandboxRenderIntent) => void;
}

const registerVegaFunctionForwarders = (): void => {
  for (const funcName of VEGA_SANDBOX_RENDER_FUNCTIONS) {
    if (!expressionFunction(funcName)) {
      expressionFunction(
        funcName,
        function handlerFwd(this: { context: { dataflow: View } }, ...args: unknown[]) {
          const view = this.context.dataflow as ViewWithSandboxHandler;
          view.runAfter(() => view._kbnVegaSandboxFunctionHandler?.({ fn: funcName, args }));
        }
      );
    }
  }
};

const updateVegaSize = (
  view: View,
  container: HTMLElement,
  dimensions?: { height?: number; width?: number }
): boolean => {
  const width = Math.floor(Math.max(0, dimensions?.width ?? container.clientWidth - 1));
  const height = Math.floor(Math.max(0, dimensions?.height ?? container.clientHeight - 1));

  if (view.width() !== width || view.height() !== height) {
    view.width(width).height(height);
    return true;
  }
  return false;
};

const createViewConfig = (
  { onError, onWarn }: VegaSandboxRenderCallbacks,
  renderer: 'canvas' | 'svg'
) => {
  const vegaLogger = logger(Warn);

  vegaLogger.warn = (...args) => {
    onWarn?.({ code: VegaSandboxWarningCode.RuntimeWarning, values: { message: String(args[0]) } });
    return vegaLogger;
  };
  vegaLogger.error = (...args) => {
    onError?.({ code: VegaSandboxErrorCode.RenderFailed, values: { message: String(args[0]) } });
    return vegaLogger;
  };

  return {
    expr: expressionInterpreter,
    loader: loader(),
    logger: vegaLogger,
    renderer,
  };
};

export const renderVegaDescriptor = async ({
  container,
  controls,
  descriptor,
  onError,
  onFunction,
  onWarn,
}: VegaSandboxRenderParams): Promise<VegaSandboxRenderController> => {
  registerVegaFunctionForwarders();

  const view = new View(
    parse(descriptor.spec, undefined, { ast: true }),
    createViewConfig({ onError, onWarn }, descriptor.renderer)
  ) as ViewWithSandboxHandler;
  let tooltipHandler: TooltipHandler | undefined;

  view._kbnVegaSandboxFunctionHandler = onFunction;

  if (descriptor.useResize) {
    updateVegaSize(view, container);
  }

  view.initialize(container, controls);

  if (descriptor.useResize) {
    updateVegaSize(view, container);
  }

  if (descriptor.useHover) {
    view.hover();
  }

  if (descriptor.tooltips && typeof descriptor.tooltips === 'object') {
    tooltipHandler = new TooltipHandler(container, view, descriptor.tooltips);
  }

  try {
    await view.runAsync();
  } catch (error) {
    onError?.({
      code: VegaSandboxErrorCode.RenderFailed,
      values: { message: error instanceof Error ? error.message : String(error) },
    });
  }

  return {
    view,
    destroy: () => {
      tooltipHandler?.hideTooltip();
      view.finalize();
    },
    resize: async (dimensions) => {
      if (descriptor.useResize && updateVegaSize(view, container, dimensions)) {
        await view.runAsync();
      }
    },
  };
};
