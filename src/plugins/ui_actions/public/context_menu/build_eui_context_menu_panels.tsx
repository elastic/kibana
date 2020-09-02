/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as React from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiToReactComponent } from '../../../kibana_react/public';
import { Action, ActionExecutionContext } from '../actions';
import { Trigger } from '../triggers';
import { BaseContext } from '../types';

export const defaultTitle = i18n.translate('uiActions.actionPanel.title', {
  defaultMessage: 'Options',
});

interface ActionWithContext<Context extends BaseContext = BaseContext> {
  action: Action<Context>;
  context: Context;

  /**
   * Trigger that caused this action
   */
  trigger: Trigger;
}

const onClick = (action: Action, context: ActionExecutionContext<object>, close: () => void) => (
  event: React.MouseEvent
) => {
  if (event.currentTarget instanceof HTMLAnchorElement) {
    // from react-router's <Link/>
    if (
      !event.defaultPrevented && // onClick prevented default
      event.button === 0 && // ignore everything but left clicks
      (!event.currentTarget.target || event.currentTarget.target === '_self') && // let browser handle "target=_blank" etc.
      !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) // ignore clicks with modifier keys
    ) {
      event.preventDefault();
      action.execute(context);
    }
  } else action.execute(context);
  close();
};

/**
 * Transforms an array of Actions to the shape EuiContextMenuPanel expects.
 */
export async function buildContextMenuForActions({
  actions,
  title = defaultTitle,
  closeMenu,
}: {
  actions: ActionWithContext[];
  title?: string;
  closeMenu: () => void;
}): Promise<EuiContextMenuPanelDescriptor[]> {
  const items: EuiContextMenuPanelItemDescriptor[] = new Array(actions.length);
  const promises = actions.map(async (item, index) => {
    const { action } = item;
    const context: ActionExecutionContext<object> = { ...item.context, trigger: item.trigger };
    const isCompatible = await item.action.isCompatible(context);
    if (!isCompatible) return;
    items[index] = {
      name: action.MenuItem
        ? React.createElement(uiToReactComponent(action.MenuItem), { context })
        : action.getDisplayName(context),
      icon: action.getIconType(context),
      panel: _.get(action, 'childContextMenuPanel.id'),
      'data-test-subj': `embeddablePanelAction-${action.id}`,
      onClick: onClick(action, context, closeMenu),
      href: action.getHref ? await action.getHref(context) : undefined,
    };
  });

  await Promise.all(promises);

  return [
    {
      id: 'mainMenu',
      title,
      items: items.filter(Boolean),
    },
  ];
}
