/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// data types
export const kibanaJSON = 'kibana-json';
export const geoPoint = 'geo-point';
export const unknownType = 'unknown';
export const gridStyle = {
  border: 'all',
  fontSize: 's',
  cellPadding: 's',
  rowHover: 'none',
};

export const pageSizeArr = [25, 50, 100];
export const defaultPageSize = 25;
export const toolbarVisibility = {
  showColumnSelector: {
    allowHide: false,
    allowReorder: true,
  },
  showStyleSelector: false,
};
