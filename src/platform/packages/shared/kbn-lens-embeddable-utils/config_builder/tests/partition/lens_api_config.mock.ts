/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MosaicState } from '../../schema/charts/mosaic';
import type { PieState } from '../../schema/charts/pie';
import type { TreemapState } from '../../schema/charts/treemap';
import type { WaffleState } from '../../schema/charts/waffle';

type PartitionConfig = PieState | MosaicState | TreemapState | WaffleState;

export const esqlCharts: Array<PartitionConfig> = [
  {
    title: 'basic pie',
    sampling: 1,
    ignore_global_filters: false,
    type: 'pie',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic donut',
    sampling: 1,
    ignore_global_filters: false,
    type: 'donut',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    donut_hole: 'medium',
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic treemap',
    sampling: 1,
    ignore_global_filters: false,
    type: 'treemap',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic mosaic',
    sampling: 1,
    ignore_global_filters: false,
    type: 'mosaic',
    metric: {
      operation: 'count',
      empty_as_null: true,
    },
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic waffle',
    sampling: 1,
    ignore_global_filters: false,
    type: 'waffle',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'auto',
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'pie with multiple groups',
    sampling: 1,
    ignore_global_filters: false,
    type: 'pie',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'donut with multiple groups',
    sampling: 1,
    ignore_global_filters: false,
    type: 'donut',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    donut_hole: 'medium',
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'treemap with multiple groups',
    sampling: 1,
    ignore_global_filters: false,
    type: 'treemap',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'mosaic with multiple groups',
    sampling: 1,
    ignore_global_filters: false,
    type: 'mosaic',
    metric: {
      operation: 'count',
      empty_as_null: true,
    },
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    group_breakdown_by: [
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'pie with multiple metrics',
    sampling: 1,
    ignore_global_filters: false,
    type: 'pie',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'donut with multiple metrics',
    sampling: 1,
    ignore_global_filters: false,
    type: 'donut',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      mode: 'percentage',
    },
    donut_hole: 'medium',
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'treemap with multiple metrics',
    sampling: 1,
    ignore_global_filters: false,
    type: 'treemap',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'waffle with multiple metrics',
    sampling: 1,
    ignore_global_filters: false,
    type: 'waffle',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        collapse_by: 'sum',
      },
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
    },
    values: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'advanced pie with legacy palette',
    sampling: 1,
    ignore_global_filters: false,
    type: 'pie',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
      {
        operation: 'terms',
        fields: ['clientip'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      mode: 'percentage',
    },
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'advanced palette with color mapping',
    sampling: 1,
    ignore_global_filters: false,
    type: 'pie',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [
            {
              values: ['success'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 6,
              },
            },
            {
              values: ['info'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 9,
              },
            },
            {
              values: ['security'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 4,
              },
            },
            {
              values: ['__other__'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 5,
              },
            },
          ],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
      {
        operation: 'terms',
        fields: ['clientip'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      mode: 'percentage',
    },
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'pie with 3 groups',
    sampling: 1,
    ignore_global_filters: false,
    type: 'pie',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
      {
        operation: 'terms',
        fields: ['clientip'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      mode: 'percentage',
    },
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'donut with color mapping',
    sampling: 1,
    ignore_global_filters: false,
    type: 'donut',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [
            {
              values: ['success'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 6,
              },
            },
            {
              values: ['info'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 9,
              },
            },
            {
              values: ['security'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 4,
              },
            },
            {
              values: ['__other__'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 5,
              },
            },
          ],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
      {
        operation: 'terms',
        fields: ['clientip'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      mode: 'percentage',
    },
    donut_hole: 'medium',
    labels: {
      visible: true,
      position: 'outside',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'treemap with color mapping',
    sampling: 1,
    ignore_global_filters: false,
    type: 'treemap',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [
            {
              values: ['success'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 6,
              },
            },
            {
              values: ['info'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 9,
              },
            },
            {
              values: ['security'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 4,
              },
            },
            {
              values: ['__other__'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 5,
              },
            },
          ],
        },
      },
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'mosaic with color mapping',
    sampling: 1,
    ignore_global_filters: false,
    type: 'mosaic',
    metric: {
      operation: 'count',
      empty_as_null: true,
    },
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [
            {
              values: ['success'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 6,
              },
            },
            {
              values: ['info'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 9,
              },
            },
            {
              values: ['security'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 4,
              },
            },
            {
              values: ['__other__'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 5,
              },
            },
          ],
        },
      },
    ],
    group_breakdown_by: [
      {
        operation: 'terms',
        fields: ['geo.dest'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
      nested: true,
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'waffle with color mapping',
    sampling: 1,
    ignore_global_filters: false,
    type: 'waffle',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [
            {
              values: ['success'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 6,
              },
            },
            {
              values: ['info'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 9,
              },
            },
            {
              values: ['security'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 4,
              },
            },
            {
              values: ['__other__'],
              color: {
                type: 'from_palette',
                palette: 'default',
                index: 5,
              },
            },
          ],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
    },
    values: {
      visible: true,
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'ESQL pie',
    sampling: 1,
    ignore_global_filters: false,
    type: 'pie',
    metrics: [
      {
        operation: 'value',
        column: 'count',
      },
    ],
    group_by: [
      {
        operation: 'value',
        column: 'category.keyword',
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'esql',
      query: 'FROM kibana_sample_data_ecommerce | STATS  count = COUNT(*) BY category.keyword',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      mode: 'percentage',
    },
    labels: {
      visible: true,
      position: 'outside',
    },
  },
  {
    title: 'ESQL treemap',
    sampling: 1,
    ignore_global_filters: false,
    type: 'treemap',
    metrics: [
      {
        operation: 'value',
        column: 'count',
      },
    ],
    group_by: [
      {
        operation: 'value',
        column: 'category.keyword',
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'esql',
      query: 'FROM kibana_sample_data_ecommerce | STATS  count = COUNT(*) BY category.keyword',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      mode: 'percentage',
    },
  },
  {
    title: 'ESQL mosaic',
    sampling: 1,
    ignore_global_filters: false,
    type: 'mosaic',
    metric: {
      operation: 'value',
      column: 'count',
    },
    group_by: [
      {
        operation: 'value',
        column: 'category.keyword',
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'esql',
      query: 'FROM kibana_sample_data_ecommerce | STATS  count = COUNT(*) BY category.keyword',
    },
    legend: {
      visibility: 'auto',
      nested: false,
    },
    values: {
      mode: 'percentage',
    },
  },
  {
    title: 'ESQL waffle',
    sampling: 1,
    ignore_global_filters: false,
    type: 'waffle',
    metrics: [
      {
        operation: 'count',
        empty_as_null: true,
      },
    ],
    group_by: [
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        collapse_by: 'sum',
      },
      {
        operation: 'terms',
        fields: ['tags.keyword'],
        size: 3,
        other_bucket: {
          include_documents_without_field: false,
        },
        rank_by: {
          type: 'column',
          metric: 0,
          direction: 'desc',
        },
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'dataView',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
    legend: {
      visibility: 'visible',
    },
    values: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'ESQL waffle with collapsed group',
    sampling: 1,
    ignore_global_filters: false,
    type: 'waffle',
    metrics: [
      {
        operation: 'value',
        column: 'count',
      },
    ],
    group_by: [
      {
        operation: 'value',
        column: 'category.keyword',
        color: {
          mode: 'categorical',
          palette: 'default',
          mapping: [],
        },
      },
    ],
    dataset: {
      type: 'esql',
      query: 'FROM kibana_sample_data_ecommerce | STATS  count = COUNT(*) BY category.keyword',
    },
    legend: {
      visibility: 'auto',
    },
    values: {
      mode: 'percentage',
    },
  },
];
