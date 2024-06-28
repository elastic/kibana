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
import { TimeSlice } from '../../../common/types';

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
  getPrecedingFilters: (
    props: GetPrecedingFiltersProps
  ) => { filters: Filter[]; timeslice?: TimeSlice } | undefined;
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
      let timeslice;
      const order = childOrder.IdsToOrder?.[id];
      if (!order || order === 0) return { filters, timeslice };
      for (let i = 0; i < order; i++) {
        const embeddable = getChild(childOrder.idsInOrder[i]);
        if (!embeddable || isErrorEmbeddable(embeddable)) return { filters, timeslice };
        const embeddableOutput = embeddable.getOutput();
        if (embeddableOutput.timeslice) {
          timeslice = embeddableOutput.timeslice;
        }
        filters = [...filters, ...(embeddableOutput.filters ?? [])];
      }
      return { filters, timeslice };
    },
    onChildChange: ({ childOutputChangedId, childOrder, recalculateFilters$, getChild }) => {
      if (childOutputChangedId === childOrder.lastChildId) {
        // the last control's output has updated, recalculate filters
        recalculateFilters$.next(null);
        return;
      }

      // when output changes on a child which isn't the last
      let nextOrder = childOrder.IdsToOrder[childOutputChangedId] + 1;
      while (nextOrder < childOrder.idsInOrder.length) {
        const nextControl = getChild(childOrder.idsInOrder[nextOrder]);

        // make the next chained embeddable updateInputFromParent
        if (nextControl?.isChained?.()) {
          setTimeout(
            () => nextControl.refreshInputFromParent(),
            1 // run on next tick
          );
          return;
        }

        // recalculate filters when there are no chained controls to the right of the updated control
        if (nextControl.id === childOrder.lastChildId) {
          recalculateFilters$.next(null);
          return;
        }

        nextOrder += 1;
      }
    },
  },
  NONE: {
    getContainerSettings: () => undefined,
    getPrecedingFilters: () => undefined,
    onChildChange: ({ recalculateFilters$ }) => recalculateFilters$.next(null),
  },
};
