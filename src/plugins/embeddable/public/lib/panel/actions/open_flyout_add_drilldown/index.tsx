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

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Action } from '../../../../../../ui_actions/public';
import { toMountPoint } from '../../../../../../kibana_react/public';
import { IEmbeddable } from '../../../embeddables';
import { CoreStart } from '../../../../../../../core/public';
import { FormCreateDrilldown } from '../../../../components/form_create_drilldown';

export const OPEN_FLYOUT_ADD_DRILLDOWN = '';

interface ActionContext {
  embeddable: IEmbeddable;
}

export interface OpenFlyoutAddDrilldownParams {
  overlays: CoreStart['overlays'];
}

export class OpenFlyoutAddDrilldown implements Action<ActionContext> {
  public readonly type = OPEN_FLYOUT_ADD_DRILLDOWN;
  public readonly id = OPEN_FLYOUT_ADD_DRILLDOWN;
  public order = 100;

  constructor(protected readonly params: OpenFlyoutAddDrilldownParams) {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.openFlyoutAddDrilldown.displayName', {
      defaultMessage: 'Add drilldown',
    });
  }

  public getIconType() {
    return 'empty';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return true;
  }

  public async execute({ embeddable }: ActionContext) {
    this.params.overlays.openFlyout(toMountPoint(<FormCreateDrilldown />));
  }
}
