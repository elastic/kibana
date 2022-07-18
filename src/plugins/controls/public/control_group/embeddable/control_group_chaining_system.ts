/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { memoize } from 'lodash';
import { Filter } from '@kbn/es-query';
import deepEqual from 'fast-deep-equal';
import { EmbeddableContainerSettings, isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { ControlEmbeddable } from '../../types';
import {
  ControlGroupChainingSystem,
  ControlGroupInput,
  ControlsPanels,
} from '../../../common/control_group/types';

interface GetPrecedingFiltersProps {
  id: string;
  childOrder: ChildEmbeddableOrderCache;
  getChild: (id: string) => ControlEmbeddable;
}

interface OnChildChangedProps {
  childOutputChangedId: string;
  recalculateFilters$: Subject<null>;
  childOrder: ChildEmbeddableOrderCache;
  getChild: (id: string) => ControlEmbeddable;
}

interface ChainingSystem {
  getContainerSettings: (
    initialInput: ControlGroupInput
  ) => EmbeddableContainerSettings | undefined;
  getPrecedingFilters: (props: GetPrecedingFiltersProps) => Filter[] | undefined;
  onChildChange: (props: OnChildChangedProps) => void;
}

export interface ChildEmbeddableOrderCache {
  IdsToOrder: { [key: string]: number };
  idsInOrder: string[];
  lastChildId: string;
}

const getOrdersFromPanels = (panels?: ControlsPanels) => {
  return Object.values(panels ?? {}).map((panel) => ({
    id: panel.explicitInput.id,
    order: panel.order,
  }));
};

export const controlOrdersAreEqual = (panelsA?: ControlsPanels, panelsB?: ControlsPanels) =>
  deepEqual(getOrdersFromPanels(panelsA), getOrdersFromPanels(panelsB));

export const cachedChildEmbeddableOrder = memoize(
  (panels: ControlsPanels) => {
    const IdsToOrder: { [key: string]: number } = {};
    const idsInOrder: string[] = [];
    Object.values(panels)
      .sort((a, b) => (a.order > b.order ? 1 : -1))
      .forEach((panel) => {
        IdsToOrder[panel.explicitInput.id] = panel.order;
        idsInOrder.push(panel.explicitInput.id);
      });
    const lastChildId = idsInOrder[idsInOrder.length - 1];
    return { IdsToOrder, idsInOrder, lastChildId } as ChildEmbeddableOrderCache;
  },
  (panels) => JSON.stringify(getOrdersFromPanels(panels))
);

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
    onChildChange: ({ childOutputChangedId, childOrder, recalculateFilters$, getChild }) => {
      if (childOutputChangedId === childOrder.lastChildId) {
        // the last control's output has updated, recalculate filters
        recalculateFilters$.next(null);
        return;
      }

      // when output changes on a child which isn't the last - make the next embeddable updateInputFromParent
      const nextOrder = childOrder.IdsToOrder[childOutputChangedId] + 1;
      if (nextOrder >= childOrder.idsInOrder.length) return;
      setTimeout(
        () => getChild(childOrder.idsInOrder[nextOrder])?.refreshInputFromParent(),
        1 // run on next tick
      );
    },
  },
  NONE: {
    getContainerSettings: () => undefined,
    getPrecedingFilters: () => undefined,
    onChildChange: ({ recalculateFilters$ }) => recalculateFilters$.next(null),
  },
};
