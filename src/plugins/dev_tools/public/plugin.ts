/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { Plugin, CoreSetup, AppMountParameters } from 'src/core/public';
import { AppUpdater } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';

import { AppNavLinkStatus, DEFAULT_APP_CATEGORIES } from '../../../core/public';
import { UrlForwardingSetup } from '../../url_forwarding/public';
import { CreateDevToolArgs, DevToolApp, createDevToolApp } from './dev_tool';

import './index.scss';

export interface DevToolsSetup {
  /**
   * Register a developer tool. It will be available
   * in the dev tools app under a separate tab.
   *
   * Registering dev tools works almost similar to registering
   * applications in the core application service,
   * but they will be rendered with a frame containing tabs
   * to switch between the tools.
   * @param devTool The dev tools descriptor
   */
  register: (devTool: CreateDevToolArgs) => DevToolApp;
}

export class DevToolsPlugin implements Plugin<DevToolsSetup, void> {
  private readonly devTools = new Map<string, DevToolApp>();
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));

  private getSortedDevTools(): readonly DevToolApp[] {
    return sortBy([...this.devTools.values()], 'order');
  }

  public setup(coreSetup: CoreSetup, { urlForwarding }: { urlForwarding: UrlForwardingSetup }) {
    const { application: applicationSetup, getStartServices } = coreSetup;

    applicationSetup.register({
      id: 'dev_tools',
      title: i18n.translate('devTools.devToolsTitle', {
        defaultMessage: 'Dev Tools',
      }),
      updater$: this.appStateUpdater,
      euiIconType: 'logoElastic',
      order: 9010,
      category: DEFAULT_APP_CATEGORIES.management,
      mount: async (params: AppMountParameters) => {
        const { element, history } = params;
        element.classList.add('devAppWrapper');

        const [core] = await getStartServices();
        const { application, chrome } = core;

        const { renderApp } = await import('./application');
        return renderApp(element, application, chrome, history, this.getSortedDevTools());
      },
    });

    urlForwarding.forwardApp('dev_tools', 'dev_tools');

    return {
      register: (devToolArgs: CreateDevToolArgs) => {
        if (this.devTools.has(devToolArgs.id)) {
          throw new Error(
            `Dev tool with id [${devToolArgs.id}] has already been registered. Use a unique id.`
          );
        }

        const devTool = createDevToolApp(devToolArgs);
        this.devTools.set(devTool.id, devTool);
        return devTool;
      },
    };
  }

  public start() {
    if (this.getSortedDevTools().length === 0) {
      this.appStateUpdater.next(() => ({ navLinkStatus: AppNavLinkStatus.hidden }));
    }
  }

  public stop() {}
}
