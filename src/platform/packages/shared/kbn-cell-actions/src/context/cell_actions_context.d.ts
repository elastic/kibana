import React from 'react';
import type { CellActionsProviderProps, GetActions } from '../types';
interface CellActionsContextValue {
    getActions: GetActions;
}
export declare const CellActionsProvider: React.FC<CellActionsProviderProps>;
export declare const useCellActionsContext: () => CellActionsContextValue;
export {};
