/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const getAspects = () => {
  return {
    x: {
      accessor: 'col-0-3',
      column: 0,
      title: 'timestamp per 3 hours',
      format: {
        id: 'date',
        params: {
          pattern: 'YYYY-MM-DD HH:mm',
        },
      },
      aggType: 'date_histogram',
      aggId: '3',
      params: {
        date: true,
        intervalESUnit: 'h',
        intervalESValue: 3,
        interval: 10800000,
        format: 'YYYY-MM-DD HH:mm',
      },
    },
    y: [
      {
        accessor: 'col-1-1',
        column: 1,
        title: 'Count',
        format: {
          id: 'number',
        },
        aggType: 'count',
        aggId: '1',
        params: {},
      },
    ],
  };
};

export const getAspectsWithSplitColumn = () => {
  return {
    x: {
      accessor: 'col-0-3',
      column: 0,
      title: 'timestamp per 3 hours',
      format: {
        id: 'date',
        params: {
          pattern: 'YYYY-MM-DD HH:mm',
        },
      },
      aggType: 'date_histogram',
      aggId: '3',
      params: {
        date: true,
        intervalESUnit: 'h',
        intervalESValue: 3,
        interval: 10800000,
        format: 'YYYY-MM-DD HH:mm',
      },
    },
    y: [
      {
        accessor: 'col-2-1',
        column: 2,
        title: 'Count',
        format: {
          id: 'number',
        },
        aggType: 'count',
        aggId: '1',
        params: {},
      },
    ],
    splitColumn: {
      accessor: 'col-1-4',
      column: 1,
      title: 'Cancelled: Descending',
      format: {
        id: 'terms',
        params: {
          id: 'boolean',
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
        },
      },
      aggType: 'terms',
      aggId: '4',
      params: {},
    },
  };
};

export const getAspectsWithSplitRow = () => {
  return {
    x: {
      accessor: 'col-0-3',
      column: 0,
      title: 'timestamp per 3 hours',
      format: {
        id: 'date',
        params: {
          pattern: 'YYYY-MM-DD HH:mm',
        },
      },
      aggType: 'date_histogram',
      aggId: '3',
      params: {
        date: true,
        intervalESUnit: 'h',
        intervalESValue: 3,
        interval: 10800000,
        format: 'YYYY-MM-DD HH:mm',
      },
    },
    y: [
      {
        accessor: 'col-2-1',
        column: 2,
        title: 'Count',
        format: {
          id: 'number',
        },
        aggType: 'count',
        aggId: '1',
        params: {},
      },
    ],
    splitRow: {
      accessor: 'col-1-4',
      column: 1,
      title: 'Cancelled: Descending',
      format: {
        id: 'terms',
        params: {
          id: 'boolean',
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
        },
      },
      aggType: 'terms',
      aggId: '4',
      params: {},
    },
  };
};

export const getHeader = () => {
  return {
    seriesIdentifier: {
      key:
        'groupId{__pseudo_stacked_group-ValueAxis-1__}spec{area-col-1-1}yAccessor{col-1-1}splitAccessors{}smV{__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__}smH{__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__}',
      specId: 'area-col-1-1',
      yAccessor: 'col-1-1',
      splitAccessors: {},
      seriesKeys: ['col-1-1'],
      smVerticalAccessorValue: '__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__',
      smHorizontalAccessorValue: '__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__',
    },
    valueAccessor: 'y1',
    label: 'Count',
    value: 1611817200000,
    formattedValue: '1611817200000',
    markValue: null,
    color: '#54b399',
    isHighlighted: false,
    isVisible: true,
  };
};

export const getValue = () => {
  return {
    seriesIdentifier: {
      key:
        'groupId{__pseudo_stacked_group-ValueAxis-1__}spec{area-col-1-1}yAccessor{col-1-1}splitAccessors{}smV{__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__}smH{__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__}',
      specId: 'area-col-1-1',
      yAccessor: 'col-1-1',
      splitAccessors: [],
      seriesKeys: ['col-1-1'],
      smVerticalAccessorValue: 'true',
      smHorizontalAccessorValue: 'false',
    },
    valueAccessor: 'y1',
    label: 'Count',
    value: 52,
    formattedValue: '52',
    markValue: null,
    color: '#54b399',
    isHighlighted: true,
    isVisible: true,
  };
};
