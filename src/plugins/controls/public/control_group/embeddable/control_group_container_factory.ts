/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Container, EmbeddableFactoryDefinition } from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';

import { ControlGroupInput, ControlGroupSettings, CONTROL_GROUP_TYPE } from '../types';
import {
  createControlGroupExtract,
  createControlGroupInject,
} from '../../../common/control_group/control_group_persistable_state';
import { getDefaultControlGroupInput } from '../../../common';

export class ControlGroupContainerFactory implements EmbeddableFactoryDefinition {
  public readonly isContainerType = true;
  public readonly type = CONTROL_GROUP_TYPE;
  public inject: EmbeddablePersistableStateService['inject'];
  public extract: EmbeddablePersistableStateService['extract'];

  constructor(private persistableStateService: EmbeddablePersistableStateService) {
    this.inject = createControlGroupInject(this.persistableStateService);
    this.extract = createControlGroupExtract(this.persistableStateService);
  }

  public isEditable = async () => false;

  public readonly getDisplayName = () => {
    return i18n.translate('controls.controlGroup.title', {
      defaultMessage: 'Control group',
    });
  };

  public getDefaultInput(): Partial<ControlGroupInput> {
    return getDefaultControlGroupInput();
  }

  public create = async (
    initialInput: ControlGroupInput,
    parent?: Container,
    settings?: ControlGroupSettings
  ) => {
    const reduxEmbeddablePackage = await lazyLoadReduxEmbeddablePackage();
    const { ControlGroupContainer } = await import('./control_group_container');
    return new ControlGroupContainer(reduxEmbeddablePackage, initialInput, parent, settings);
  };
}
