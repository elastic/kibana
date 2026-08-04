import type { CellAction, CellActionFactory, CellActionTemplate } from '../types';
export declare const createCellActionFactory: <C extends CellAction = CellAction, P = void>(actionCreator: (params: P) => CellActionTemplate<C>) => (params: P) => CellActionFactory<C>;
