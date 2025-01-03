/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { ILicense, LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { createStartServicesGetter, Storage } from '@kbn/kibana-utils-plugin/public';
import { UiActionsServiceEnhancements } from './services';
import { createPublicDrilldownManager, PublicDrilldownManagerComponent } from './drilldowns';
import { dynamicActionEnhancement } from './dynamic_actions/dynamic_action_enhancement';

interface SetupDependencies {
  embeddable: EmbeddableSetup; // Embeddable are needed because they register basic triggers/actions.
  uiActions: UiActionsSetup;
  licensing?: LicensingPluginSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  licensing?: LicensingPluginStart;
}

export interface SetupContract
  extends UiActionsSetup,
    Pick<UiActionsServiceEnhancements, 'registerDrilldown'> {}

export interface StartContract
  extends UiActionsStart,
    Pick<
      UiActionsServiceEnhancements,
      | 'getActionFactory'
      | 'hasActionFactory'
      | 'getActionFactories'
      | 'telemetry'
      | 'extract'
      | 'inject'
    > {
  DrilldownManager: PublicDrilldownManagerComponent;
}

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
    { embeddable, uiActions, licensing }: SetupDependencies
  ): SetupContract {
    const startServices = createStartServicesGetter(core.getStartServices);
    this.enhancements = new UiActionsServiceEnhancements({
      getLicense: () => this.getLicenseInfo(),
      featureUsageSetup: licensing?.featureUsage,
      getFeatureUsageStart: () => startServices().plugins.licensing?.featureUsage,
    });
    embeddable.registerEnhancement(dynamicActionEnhancement(this.enhancements));
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
      DrilldownManager: createPublicDrilldownManager({
        actionFactories: this.enhancements!.getActionFactories(),
        getTrigger: (triggerId) => uiActions.getTrigger(triggerId),
        storage: new Storage(window?.localStorage),
        toastService: core.notifications.toasts,
        docsLink: core.docLinks.links.dashboard.drilldowns,
        triggerPickerDocsLink: core.docLinks.links.dashboard.drilldownsTriggerPicker,
      }),
    };
  }

  public stop() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
