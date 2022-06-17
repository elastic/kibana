/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { KpiHostsEmbeddable, KPI_HOSTS_EMBEDDABLE } from './kpi_hosts_embeddable';

export type KpiHostsEmbeddableFactory = EmbeddableFactory;
export class KpiHostsEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = KPI_HOSTS_EMBEDDABLE;

  /**
   * In our simple example, we let everyone have permissions to edit this. Most
   * embeddables should check the UI Capabilities service to be sure of
   * the right permissions.
   */
  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    return new KpiHostsEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.helloworld.displayName', {
      defaultMessage: 'hello world',
    });
  }
}
