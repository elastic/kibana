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

import {
  Container,
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
} from '../../../../../../embeddable/public';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupInput, CONTROL_GROUP_TYPE } from '../types';
import { ControlGroupContainer } from './control_group_container';
import { EmbeddablePersistableStateService } from '../../../../../../embeddable/common';
import {
  createControlGroupExtract,
  createControlGroupInject,
} from '../../../../../common/controls/control_group/control_group_persistable_state';

export type DashboardContainerFactory = EmbeddableFactory<
  ControlGroupInput,
  ContainerOutput,
  ControlGroupContainer
>;
export class ControlGroupContainerFactory
  implements EmbeddableFactoryDefinition<ControlGroupInput, ContainerOutput, ControlGroupContainer>
{
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

  public create = async (
    initialInput: ControlGroupInput,
    parent?: Container
  ): Promise<ControlGroupContainer | ErrorEmbeddable> => {
    return new ControlGroupContainer(initialInput, parent);
  };

  public inject = createControlGroupInject(this.persistableStateService);
  public extract = createControlGroupExtract(this.persistableStateService);
}
