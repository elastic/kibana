/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';

import { ControlEmbeddable } from '../../types';
import { ChildEmbeddableOrderCache } from './control_group_container';
import { EmbeddableContainerSettings, isErrorEmbeddable } from '../../../../embeddable/public';
import { ControlGroupChainingSystem, ControlGroupInput } from '../../../common/control_group/types';

interface GetPrecedingFiltersProps {
  id: string;
  childOrder: ChildEmbeddableOrderCache;
  getChild: (id: string) => ControlEmbeddable;
}

interface ChainingSystem {
  getContainerSettings: (
    initialInput: ControlGroupInput
  ) => EmbeddableContainerSettings | undefined;
  getPrecedingFilters: (props: GetPrecedingFiltersProps) => Filter[] | undefined;
}

export const ControlGroupChainingSystems: {
  [key in ControlGroupChainingSystem]: ChainingSystem;
} = {
  HIERARCHICAL: {
    getContainerSettings: (initialInput) => ({
      childIdInitializeOrder: Object.values(initialInput.panels)
        .sort((a, b) => (a.order > b.order ? 1 : -1))
        .map((panel) => panel.explicitInput.id),
      initializeSequentially: true,
    }),
    getPrecedingFilters: ({ id, childOrder, getChild }) => {
      let filters: Filter[] = [];
      const order = childOrder.IdsToOrder?.[id];
      if (!order || order === 0) return filters;
      for (let i = 0; i < order; i++) {
        const embeddable = getChild(childOrder.idsInOrder[i]);
        if (!embeddable || isErrorEmbeddable(embeddable)) return filters;
        filters = [...filters, ...(embeddable.getOutput().filters ?? [])];
      }
      return filters;
    },
  },
  NONE: {
    getContainerSettings: () => undefined,
    getPrecedingFilters: () => undefined,
  },
};
