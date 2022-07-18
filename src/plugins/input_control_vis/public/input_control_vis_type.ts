/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { VisGroups, VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import { getControlsTab, OptionsTabLazy } from './components/editor';
import { InputControlVisDependencies } from './plugin';
import { toExpressionAst } from './to_ast';
import { InputControlVisParams } from './types';

export function createInputControlVisTypeDefinition(
  deps: InputControlVisDependencies
): VisTypeDefinition<InputControlVisParams> {
  const ControlsTab = getControlsTab(deps);

  return {
    name: 'input_control_vis',
    title: i18n.translate('inputControl.register.controlsTitle', {
      defaultMessage: 'Input controls',
    }),
    icon: 'controlsHorizontal',
    group: VisGroups.TOOLS,
    description: i18n.translate('inputControl.register.controlsDescription', {
      defaultMessage: 'Input controls are deprecated and will be removed in a future version.',
    }),
    stage: 'experimental',
    isDeprecated: true,
    visConfig: {
      defaults: {
        controls: [],
        updateFiltersOnChange: false,
        useTimeFilter: false,
        pinFilters: false,
      },
    },
    editorConfig: {
      optionTabs: [
        {
          name: 'controls',
          title: i18n.translate('inputControl.register.tabs.controlsTitle', {
            defaultMessage: 'Controls',
          }),
          editor: ControlsTab,
        },
        {
          name: 'options',
          title: i18n.translate('inputControl.register.tabs.optionsTitle', {
            defaultMessage: 'Options',
          }),
          editor: OptionsTabLazy,
        },
      ],
    },
    inspectorAdapters: {},
    toExpressionAst,
  };
}
