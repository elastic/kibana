/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ADD_PANEL_ANNOTATION_GROUP } from '@kbn/embeddable-plugin/public';
import { apiCanAddNewSection, CanAddNewSection } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { ACTION_ADD_SECTION } from './constants';

type AddSectionActionApi = CanAddNewSection;

const isApiCompatible = (api: unknown | null): api is AddSectionActionApi =>
  Boolean(apiCanAddNewSection(api));

export class AddSectionAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_ADD_SECTION;
  public readonly id = ACTION_ADD_SECTION;
  public order = 40;
  public grouping = [ADD_PANEL_ANNOTATION_GROUP];

  public getDisplayName() {
    return i18n.translate('dashboard.collapsibleSection.displayName', {
      defaultMessage: 'Collapsible section',
    });
  }

  public getIconType() {
    return 'section';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewSection();
  }
}
