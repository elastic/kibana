import type { FC, PropsWithChildren } from 'react';
import type { RuntimePrimitiveTypes } from '../../shared_imports';
import type { Context } from './types';
import type { PreviewController } from './preview_controller';
export declare const defaultValueFormatter: (value: unknown) => string;
export declare const valueTypeToSelectedType: (value: unknown) => RuntimePrimitiveTypes;
export declare const FieldPreviewProvider: FC<PropsWithChildren<{
    controller: PreviewController;
}>>;
export declare const useFieldPreviewContext: () => Context;
