import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;
export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type SharedSetOfIcons = 'asterisk' | 'alert' | 'bell' | 'bolt' | 'bug' | 'editorComment' | 'flag' | 'heart' | 'mapMarker' | 'starEmpty' | 'tag';
export type AnnotationReferenceLineIcons = SharedSetOfIcons | 'circle' | 'pinFilled' | 'starFilled' | 'triangle';
