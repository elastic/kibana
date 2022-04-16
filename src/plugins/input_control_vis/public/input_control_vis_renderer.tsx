/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionRenderDefinition } from '@kbn/expressions-plugin';
import { InputControlVisDependencies } from './plugin';
import { InputControlRenderValue } from './input_control_fn';
import type { InputControlVisControllerType } from './vis_controller';

const inputControlVisRegistry = new Map<HTMLElement, InputControlVisControllerType>();

export const getInputControlVisRenderer: (
  deps: InputControlVisDependencies
) => ExpressionRenderDefinition<InputControlRenderValue> = (deps) => ({
  name: 'input_control_vis',
  reuseDomNode: true,
  render: async (domNode, { visConfig }, handlers) => {
    let registeredController = inputControlVisRegistry.get(domNode);

    if (!registeredController) {
      const { createInputControlVisController } = await import('./vis_controller');

      registeredController = createInputControlVisController(deps, handlers, domNode);
      inputControlVisRegistry.set(domNode, registeredController);

      handlers.onDestroy(() => {
        registeredController?.destroy();
        inputControlVisRegistry.delete(domNode);
      });
    }

    await registeredController.render(visConfig);
    handlers.done();
  },
});
