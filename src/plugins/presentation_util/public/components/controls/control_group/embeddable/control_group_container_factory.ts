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

import { Container, EmbeddableFactoryDefinition } from '../../../../../../embeddable/public';
import { EmbeddablePersistableStateService } from '../../../../../../embeddable/common';
import { ControlGroupInput, CONTROL_GROUP_TYPE } from '../types';
import { ControlGroupStrings } from '../control_group_strings';
import {
  createControlGroupExtract,
  createControlGroupInject,
} from '../../../../../common/controls/control_group/control_group_persistable_state';

export class ControlGroupContainerFactory implements EmbeddableFactoryDefinition {
  public readonly isContainerType = true;
  public readonly type = CONTROL_GROUP_TYPE;

  constructor(private persistableStateService: EmbeddablePersistableStateService) {}

  public isEditable = async () => false;

  public readonly getDisplayName = () => {
    return ControlGroupStrings.getEmbeddableTitle();
  };

  public getDefaultInput(): Partial<ControlGroupInput> {
    return {
      panels: {},
      ignoreParentSettings: {
        ignoreFilters: false,
        ignoreQuery: false,
        ignoreTimerange: false,
      },
    };
  }

  public create = async (initialInput: ControlGroupInput, parent?: Container) => {
    const { ControlGroupContainer } = await import('./control_group_container');
    return new ControlGroupContainer(initialInput, parent);
  };

  public inject = createControlGroupInject(this.persistableStateService);
  public extract = createControlGroupExtract(this.persistableStateService);
}
