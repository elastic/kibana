/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { UiActionsServiceEnhancements } from './services';

interface SetupDependencies {
  uiActions: UiActionsSetup;
  licensing?: LicensingPluginSetup;
}

export interface StartDependencies {
  uiActions: UiActionsStart;
  licensing?: LicensingPluginStart;
}

export type SetupContract = UiActionsSetup;

export interface StartContract
  extends UiActionsStart,
    Pick<
      UiActionsServiceEnhancements,
      'getActionFactory' | 'hasActionFactory' | 'getActionFactories'
    > {}

export class AdvancedUiActionsPublicPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  readonly licenseInfo = new BehaviorSubject<ILicense | undefined>(undefined);
  private getLicenseInfo(): ILicense {
    if (!this.licenseInfo.getValue()) {
      throw new Error(
        'AdvancedUiActionsPublicPlugin: License is not ready! License becomes available only after setup.'
      );
    }
    return this.licenseInfo.getValue()!;
  }
  private enhancements?: UiActionsServiceEnhancements;
  private subs: Subscription[] = [];

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<StartDependencies>,
    { uiActions, licensing }: SetupDependencies
  ): SetupContract {
    const startServices = createStartServicesGetter(core.getStartServices);
    this.enhancements = new UiActionsServiceEnhancements({
      getLicense: () => this.getLicenseInfo(),
      featureUsageSetup: licensing?.featureUsage,
      getFeatureUsageStart: () => startServices().plugins.licensing?.featureUsage,
    });
    return {
      ...uiActions,
      ...this.enhancements,
    };
  }

  public start(core: CoreStart, { uiActions, licensing }: StartDependencies): StartContract {
    if (licensing) this.subs.push(licensing.license$.subscribe(this.licenseInfo));

    return {
      ...uiActions,
      ...this.enhancements!,
    };
  }

  public stop() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
