/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PartitionState } from '../../schema/charts/partition';

export const esqlCharts = [
  {
    title: 'basic pie',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic donut',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
    donut_hole: 'medium',
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic treemap',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic mosaic',
    type: 'mosaic',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'basic waffle',
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
      visible: 'auto',
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'pie with multiple groups',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'donut with multiple groups',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    donut_hole: 'medium',
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'treemap with multiple groups',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'mosaic with multiple groups',
    type: 'mosaic',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'pie with multiple metrics',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'donut with multiple metrics',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    donut_hole: 'medium',
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'treemap with multiple metrics',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'waffle with multiple metrics',
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
      visible: 'show',
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'advanced pie with legacy palette',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'advanced palette with color mapping',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'pie with 3 groups',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'donut with color mapping',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    donut_hole: 'medium',
    label_position: 'outside',
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'treemap with color mapping',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'mosaic with color mapping',
    type: 'mosaic',
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
      visible: 'show',
      nested: true,
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'waffle with color mapping',
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
      visible: 'show',
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'ESQL pie',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
    label_position: 'outside',
  },
  {
    title: 'ESQL treemap',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
  },
  {
    title: 'ESQL mosaic',
    type: 'mosaic',
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
      visible: 'auto',
      nested: false,
    },
    value_display: {
      mode: 'percentage',
    },
  },
  {
    title: 'ESQL waffle',
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
      visible: 'show',
    },
    value_display: {
      mode: 'percentage',
    },
    query: {
      query: '',
      language: 'kuery',
    },
  },
  {
    title: 'ESQL waffle with collapsed group',
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
      visible: 'auto',
    },
    value_display: {
      mode: 'percentage',
    },
  },
] as Omit<PartitionState, 'ignore_global_filters' | 'sampling'>[];
