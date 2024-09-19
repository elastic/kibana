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
} from '../../../../../embeddable/public';
import { ControlGroupInput } from './types';
import { ControlsService } from '../controls_service';
import { ControlGroupStrings } from './control_group_strings';
import { CONTROL_GROUP_TYPE } from './control_group_constants';
import { ControlGroupContainer } from './control_group_container';
import { PresentationOverlaysService } from '../../../services/overlays';

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
  public readonly controlsService: ControlsService;
  private readonly overlays: PresentationOverlaysService;

  constructor(controlsService: ControlsService, overlays: PresentationOverlaysService) {
    this.overlays = overlays;
    this.controlsService = controlsService;
  }

  public isEditable = async () => false;

  public readonly getDisplayName = () => {
    return ControlGroupStrings.getEmbeddableTitle();
  };

  public getDefaultInput(): Partial<ControlGroupInput> {
    return {
      panels: {},
      inheritParentState: {
        useFilters: true,
        useQuery: true,
        useTimerange: true,
      },
    };
  }

  public create = async (
    initialInput: ControlGroupInput,
    parent?: Container
  ): Promise<ControlGroupContainer | ErrorEmbeddable> => {
    return new ControlGroupContainer(initialInput, this.controlsService, this.overlays, parent);
  };
}
