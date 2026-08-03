import type { VisParams } from '@kbn/visualizations-common';
import type { VisEditorConstructor } from './visualize_app/types';
export declare const createVisEditorsRegistry: () => {
    registerDefault: (editor: VisEditorConstructor) => void;
    register: <TVisParams extends VisParams>(name: string, editor: VisEditorConstructor<TVisParams>) => void;
    get: (name: string) => VisEditorConstructor<any> | undefined;
};
export type VisEditorsRegistry = ReturnType<typeof createVisEditorsRegistry>;
