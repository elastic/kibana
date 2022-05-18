/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { ElasticSearchHit } from '../../types';
import { IgnoredReason } from '../../utils/get_ignored_reason';

export interface FieldMapping {
  filterable?: boolean;
  scripted?: boolean;
  rowCount?: number;
  type: string;
  name: string;
  displayName?: string;
}

export type DocViewFilterFn = (
  mapping: FieldMapping | string | undefined,
  value: unknown,
  mode: '+' | '-'
) => void;

export interface DocViewRenderProps {
  hit: ElasticSearchHit;
  indexPattern: DataView;
  columns?: string[];
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
}
export type DocViewerComponent = React.FC<DocViewRenderProps>;
export type DocViewRenderFn = (
  domeNode: HTMLDivElement,
  renderProps: DocViewRenderProps
) => () => void;

export interface BaseDocViewInput {
  order: number;
  shouldShow?: (hit: ElasticSearchHit) => boolean;
  title: string;
}

export interface RenderDocViewInput extends BaseDocViewInput {
  render: DocViewRenderFn;
  component?: undefined;
  directive?: undefined;
}

interface ComponentDocViewInput extends BaseDocViewInput {
  component: DocViewerComponent;
  render?: undefined;
  directive?: undefined;
}

export type DocViewInput = ComponentDocViewInput | RenderDocViewInput;

export type DocView = DocViewInput & {
  shouldShow: NonNullable<DocViewInput['shouldShow']>;
};

export type DocViewInputFn = () => DocViewInput;

export interface FieldRecordLegacy {
  action: {
    isActive: boolean;
    onFilter?: DocViewFilterFn;
    onToggleColumn: (field: string) => void;
    flattenedField: unknown;
  };
  field: {
    displayName: string;
    field: string;
    scripted: boolean;
    fieldType?: string;
    fieldMapping?: DataViewField;
  };
  value: {
    formattedValue: string;
    ignored?: IgnoredReason;
  };
}
