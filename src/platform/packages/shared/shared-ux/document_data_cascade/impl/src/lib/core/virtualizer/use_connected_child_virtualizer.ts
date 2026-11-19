/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createVirtualizerApi } from './virtualizer_api';
import { areSameRows, scrollToChildItem } from './utils';
import type {
  ChildConnectionHandle,
  ChildVirtualizerController,
  UseConnectedChildVirtualizerOptions,
  UseConnectedChildVirtualizerResult,
  VirtualizerInstanceType,
  VirtualizerItem,
} from './types';

/**
 * How long the position a restoration scrolls to has to stay unchanged before the restoration is finished.
 * The position keeps moving while the rows above the restored one are measured and the surrounding layout
 * settles; whether a row has been measured can't be used as the signal, a measurement that matches the
 * estimate is indistinguishable from none.
 */
export const RESTORATION_SETTLE_MS = 200;

/** Upper bound for a restoration whose position never stops moving, the cascade stays hidden until it ends. */
export const RESTORATION_TIMEOUT_MS = 2000;

/**
 * Subscribes to a value derived from the child virtualizer controller. The selector is read on every
 * notification, so it has to return a primitive or a value that is stable while nothing changed.
 */
export const useControllerValue = <T>(
  controller: ChildVirtualizerController,
  selector: (controller: ChildVirtualizerController) => T,
  serverValue: T
): T =>
  useSyncExternalStore(
    controller.subscribe,
    () => selector(controller),
    () => serverValue
  );

/** Connects an independently measured list to the cascade's shared scroll container. */
export const useConnectedChildVirtualizer = <T extends VirtualizerItem>({
  controller,
  cellId,
  rowIndex,
  rows,
  estimatedRowHeight = 65,
  overscan,
  scrollMarginOffset = 0,
  scrollPaddingStart = 0,
  scrollPaddingEnd = 0,
  privateScrollElement,
  measurementKey = '',
}: UseConnectedChildVirtualizerOptions<T>): UseConnectedChildVirtualizerResult => {
  const isActive = useControllerValue(controller, (c) => c.shouldActivate(cellId), false);
  const isDetached = useControllerValue(controller, (c) => c.isDetached(cellId), false);
  const restoreAnchor = useControllerValue<number | null>(
    controller,
    (c) => c.getRestoreAnchor(cellId),
    null
  );
  const rootScrollMargin = useControllerValue(
    controller,
    (c) => c.getScrollMarginForRow(rowIndex),
    0
  );

  const connectionRef = useRef<ChildConnectionHandle | null>(null);
  const lastAttachedOffset = useRef(controller.getInitialOffset());
  const layoutKey = `${measurementKey}:${isDetached}`;

  const initialMeasurementsCache = useMemo(
    () => controller.getMeasurements(cellId, rows, layoutKey),
    [controller, cellId, rows, layoutKey]
  );

  const handle = useMemo<UseConnectedChildVirtualizerResult['handle']>(
    () => ({
      detachScrollElement: () => {
        if (privateScrollElement?.current) connectionRef.current?.detachScrollElement();
      },
      reattachScrollElement: () => connectionRef.current?.reattachScrollElement(),
    }),
    [privateScrollElement]
  );

  const rowIndexRef = useRef(rowIndex);
  rowIndexRef.current = rowIndex;

  const wasDetached = useRef(isDetached);

  const reportState = useCallback(
    (instance: VirtualizerInstanceType) => {
      if (!isActive) return;

      if (!isDetached && !wasDetached.current) {
        lastAttachedOffset.current = instance.scrollOffset ?? 0;
      }

      connectionRef.current?.reportState({
        scrollOffset: instance.scrollOffset ?? 0,
        range: instance.range
          ? { startIndex: instance.range.startIndex, endIndex: instance.range.endIndex }
          : null,
        totalSize: instance.getTotalSize(),
        totalItemCount: rows.length,
        scrollAnchorItemIndex:
          instance.getVirtualItemForOffset(
            (instance.scrollOffset ?? 0) + (isDetached ? 0 : scrollPaddingStart)
          )?.index ?? null,
        hasStabilized: restoreAnchor === null,
      });
    },
    [rows.length, isActive, isDetached, restoreAnchor, scrollPaddingStart]
  );

  const getScrollElement = useCallback(
    () =>
      isDetached && privateScrollElement?.current
        ? privateScrollElement.current
        : isActive
        ? controller.getScrollElement()
        : null,
    [isDetached, privateScrollElement, controller, isActive]
  );

  const getItemKey = useCallback((index: number) => rows[index].id, [rows]);

  const instance = useVirtualizer({
    count: isActive ? rows.length : 0,
    estimateSize: () => estimatedRowHeight,
    getItemKey,
    getScrollElement,
    overscan,
    scrollMargin: isDetached ? 0 : rootScrollMargin + scrollMarginOffset,
    scrollPaddingStart: isDetached ? 0 : scrollPaddingStart,
    scrollPaddingEnd: isDetached ? 0 : scrollPaddingEnd,
    initialOffset: controller.getInitialOffset,
    initialMeasurementsCache,
    onChange: reportState,
  });

  useLayoutEffect(() => {
    const connection = controller.connect(cellId, rowIndexRef.current, instance.cancelScroll);
    connectionRef.current = connection;
    return () => {
      connection.disconnect();
      connectionRef.current = null;
    };
  }, [controller, cellId, instance]);

  // useLayoutEffect(() => connectionRef.current?.reportState({ rowIndex }), [rowIndex]);

  const measure = useCallback(() => {
    // `measure` only drops the sizes it has cached, so the rows that are rendered are read again straight away
    instance.measure();
    instance.elementsCache.forEach((element) => {
      if (element.isConnected) instance.measureElement(element);
    });
  }, [instance]);

  const previousLayout = useRef({ rows, layoutKey });
  useLayoutEffect(() => {
    const previous = previousLayout.current;
    if (!areSameRows(previous.rows, rows) || previous.layoutKey !== layoutKey) measure();
    previousLayout.current = { rows, layoutKey };
  }, [measure, rows, layoutKey]);

  useLayoutEffect(() => {
    if (wasDetached.current === isDetached) return;
    instance.cancelScroll();
    instance.scrollToOffset(isDetached ? 0 : lastAttachedOffset.current);
    wasDetached.current = isDetached;
  }, [instance, isDetached]);

  const restoration = useRef<{
    offset?: number;
    deadline?: number;
    settleTimer?: ReturnType<typeof setTimeout>;
  }>({});
  useLayoutEffect(() => {
    if (restoreAnchor === null || !isActive || isDetached) return;
    if (restoreAnchor < 0 || restoreAnchor >= rows.length) {
      controller.finishRestoration(cellId);
      return;
    }
    instance.getTotalSize();
    const item = instance.measurementsCache[restoreAnchor];
    if (!item) return;
    const offset = item.start - scrollPaddingStart;
    if (restoration.current.offset === offset) return;

    controller.cancelRootScroll();
    instance.scrollToOffset(offset, { align: 'start', behavior: 'auto' });
    restoration.current.offset = offset;

    // The position moved, so the wait for it to settle starts over, without ever going past the deadline
    const now = Date.now();
    restoration.current.deadline ??= now + RESTORATION_TIMEOUT_MS;
    clearTimeout(restoration.current.settleTimer);
    restoration.current.settleTimer = setTimeout(
      () => controller.finishRestoration(cellId),
      Math.min(RESTORATION_SETTLE_MS, restoration.current.deadline - now)
    );
  });

  useEffect(() => {
    const pending = restoration.current;
    return () => clearTimeout(pending.settleTimer);
  }, []);

  useLayoutEffect(() => {
    reportState(instance);
    return () => {
      if (isActive)
        controller.saveMeasurements(cellId, { rows, layoutKey, items: instance.takeSnapshot() });
    };
  }, [instance, reportState, controller, cellId, rows, layoutKey, isActive]);

  instance.shouldAdjustScrollPositionOnItemSizeChange = (item) =>
    restoreAnchor === null && item.start < (instance.scrollOffset ?? 0);

  const virtualizer = useMemo(() => {
    const scrollToIndex: VirtualizerInstanceType['scrollToIndex'] = (index, options) => {
      controller.finishRestoration();
      controller.cancelRootScroll();
      if (isDetached) instance.scrollToIndex(index, options);
      else scrollToChildItem(instance, index, options);
    };
    // assigned onto the api rather than spread with it, so that its getters keep reading the live instance
    return Object.assign(createVirtualizerApi(instance), { measure, scrollToIndex });
  }, [instance, controller, isDetached, measure]);

  return useMemo(() => ({ virtualizer, handle, isDetached }), [virtualizer, handle, isDetached]);
};
