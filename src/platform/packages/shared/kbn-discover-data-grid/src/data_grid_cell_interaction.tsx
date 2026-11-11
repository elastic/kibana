/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type {
  FocusEventHandler,
  KeyboardEventHandler,
  MutableRefObject,
  ReactNode,
  RefCallback,
} from 'react';
import { EuiFocusTrap, keys } from '@elastic/eui';

import type { DataGridCellAddress } from './data_grid_api';

interface DataGridCellInteractionContextValue {
  readonly address: DataGridCellAddress;
  readonly isActive: boolean;
  readonly registerTarget: (address: DataGridCellAddress, element: HTMLElement | null) => void;
  readonly enter: (address: DataGridCellAddress) => void;
  readonly leave: (address: DataGridCellAddress) => void;
}

const DataGridCellInteractionContext = createContext<DataGridCellInteractionContextValue | null>(
  null
);

interface DataGridCellInteractionProviderProps extends DataGridCellInteractionContextValue {
  readonly deactivate: (address: DataGridCellAddress) => void;
  readonly children: ReactNode;
}

export const DataGridCellInteractionProvider = ({
  address,
  isActive,
  registerTarget,
  enter,
  deactivate,
  leave,
  children,
}: DataGridCellInteractionProviderProps): React.ReactElement => {
  const value = useMemo(
    () => ({ address, isActive, registerTarget, enter, leave }),
    [address, enter, isActive, leave, registerTarget]
  );

  return (
    <DataGridCellInteractionContext.Provider value={value}>
      <EuiFocusTrap
        disabled={!isActive}
        clickOutsideDisables={true}
        returnFocus={false}
        onClickOutside={() => deactivate(address)}
        onDeactivation={() => deactivate(address)}
      >
        {children}
      </EuiFocusTrap>
    </DataGridCellInteractionContext.Provider>
  );
};

export interface InternalDataGridCellInteractionProps<TElement extends HTMLElement> {
  readonly ref: RefCallback<TElement>;
  readonly tabIndex: 0 | -1;
  readonly onFocus: FocusEventHandler<TElement>;
  readonly onKeyDown: KeyboardEventHandler<TElement>;
}

/** Registers a package-owned cell control with the logical focus system. */
export const useDataGridCellInteraction = <
  TElement extends HTMLElement
>(): InternalDataGridCellInteractionProps<TElement> => {
  const context = useContext(DataGridCellInteractionContext);
  if (!context) {
    throw new Error('Cell interaction controls must be rendered inside a data grid cell.');
  }

  const { address, isActive, registerTarget, enter, leave } = context;
  const currentElementRef: MutableRefObject<TElement | null> = React.useRef(null);
  const ref = useCallback<RefCallback<TElement>>(
    (element) => {
      if (currentElementRef.current === element) {
        return;
      }
      if (currentElementRef.current) {
        registerTarget(address, null);
      }
      currentElementRef.current = element;
      if (element) {
        registerTarget(address, element);
      }
    },
    [address, registerTarget]
  );
  const onFocus = useCallback<FocusEventHandler<TElement>>(() => enter(address), [address, enter]);
  const onKeyDown = useCallback<KeyboardEventHandler<TElement>>(
    (event) => {
      if (event.key !== keys.ESCAPE) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      leave(address);
    },
    [address, leave]
  );

  return { ref, tabIndex: isActive ? 0 : -1, onFocus, onKeyDown };
};
