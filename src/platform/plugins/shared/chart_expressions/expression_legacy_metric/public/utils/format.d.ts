import type { ReactNode } from 'react';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
export declare const formatValueAsText: (value: number | string, fieldFormatter: IFieldFormat) => string;
export declare const formatValueAsReactNode: (value: number | string, fieldFormatter: IFieldFormat) => ReactNode;
