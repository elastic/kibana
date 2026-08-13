/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import {
  type ICPSManager,
  type CPSAppAccessResolver,
  type HeaderContextMenuItemProps,
} from '@kbn/cps-utils';
import { CPS_TIER_ELIGIBLE_FEATURE_ID } from '@kbn/cps-common';
import { i18n } from '@kbn/i18n';
import type {
  CPSPluginSetup,
  CPSPluginStart,
  CPSPluginStartDependencies,
  CPSConfigType,
} from './types';
import { CPSManager } from './services/cps_manager';

/** Builds the Cloud console URL for managing cross-project search links. */
export const getManageCrossProjectSearchUrl = (cloud?: CloudStart): string | undefined => {
  const { baseUrl } = cloud ?? {};
  const { projectId, projectType } = cloud?.serverless ?? {};
  if (!baseUrl || !projectId || !projectType) {
    return undefined;
  }

  try {
    return new URL(
      `projects/${projectType}/${projectId}/cross-project-search`,
      baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    ).toString();
  } catch {
    return undefined;
  }
};

export const getCustomHeaderContextMenuItems = (
  core: CoreStart,
  cloud?: CloudStart
): HeaderContextMenuItemProps[] => {
  const items: HeaderContextMenuItemProps[] = [
    {
      icon: 'controls',
      label: i18n.translate('cps.projectPicker.header.adjustSpaceDefaultsLinkText', {
        defaultMessage: 'Adjust space defaults',
      }),
      testSubj: 'projectPickerAdjustSpaceDefaultsMenuItem',
      href: core.application.getUrlForApp('management', {
        path: `kibana/spaces/edit/${core.http.spaceId}`,
      }),
    },
  ];

  const manageCrossProjectSearchUrl = getManageCrossProjectSearchUrl(cloud);
  if (manageCrossProjectSearchUrl) {
    items.push({
      icon: 'gear',
      label: i18n.translate('cps.projectPicker.header.manageCrossProjectSearchLinkText', {
        defaultMessage: 'Manage cross-project search',
      }),
      testSubj: 'projectPickerManageCrossProjectSearchMenuItem',
      href: manageCrossProjectSearchUrl,
      external: true,
    });
  }

  return items;
};

export class CpsPlugin
  implements Plugin<CPSPluginSetup, CPSPluginStart, {}, CPSPluginStartDependencies>
{
  private readonly initializerContext: PluginInitializerContext<CPSConfigType>;
  private readonly appAccessResolvers = new Map<string, CPSAppAccessResolver>();

  constructor(initializerContext: PluginInitializerContext<CPSConfigType>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup): CPSPluginSetup {
    const { cpsEnabled } = this.initializerContext.config.get();

    return {
      cpsEnabled,
      registerAppAccess: (appId: string, resolver: CPSAppAccessResolver) => {
        this.appAccessResolvers.set(appId, resolver);
      },
    };
  }

  public start(core: CoreStart, { cloud }: CPSPluginStartDependencies = {}): CPSPluginStart {
    const { cpsEnabled } = this.initializerContext.config.get();
    let cpsManager: ICPSManager | undefined;

    if (cpsEnabled) {
      const manager = new CPSManager({
        http: core.http,
        logger: this.initializerContext.logger.get('cps'),
        application: core.application,
        appAccessResolvers: this.appAccessResolvers,
      });

      // Register project picker only after the default project routing is known
      manager.whenReady().then(() =>
        import('@kbn/cps-utils').then(({ ProjectPickerContainer }) => {
          const customHeaderContextMenuItems = getCustomHeaderContextMenuItems(core, cloud);

          // register into solution-view chrome next header
          core.chrome.next.projectPicker.set(
            <ProjectPickerContainer
              cpsManager={manager}
              customHeaderContextMenuItems={customHeaderContextMenuItems}
            />
          );

          // register into legacy chrome header
          core.chrome.navControls.registerLeft({
            mount: (element) => {
              ReactDOM.render(
                core.rendering.addContext(
                  <ProjectPickerContainer
                    cpsManager={manager}
                    customHeaderContextMenuItems={customHeaderContextMenuItems}
                  />
                ),
                element,
                () => {}
              );

              return () => {
                ReactDOM.unmountComponentAtNode(element);
              };
            },
            order: 1000,
          });
        })
      );
      cpsManager = manager;
    }

    const isTierEligible = core.pricing.isFeatureAvailable(CPS_TIER_ELIGIBLE_FEATURE_ID);

    return {
      cpsManager,
      isTierEligible,
    };
  }

  public stop() {}
}
