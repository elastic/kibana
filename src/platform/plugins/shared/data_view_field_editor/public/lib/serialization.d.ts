import { monaco } from '@kbn/monaco';
import type { DataViewField, DataView } from '../shared_imports';
import type { Field, RuntimeFieldPainlessError } from '../types';
export declare const deserializeField: (dataView: DataView, field?: DataViewField) => Field | undefined;
export declare const painlessErrorToMonacoMarker: ({ reason }: RuntimeFieldPainlessError, startPosition: monaco.Position) => monaco.editor.IMarkerData | undefined;
