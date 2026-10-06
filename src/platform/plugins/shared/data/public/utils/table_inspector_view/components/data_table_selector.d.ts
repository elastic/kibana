/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { Component } from 'react';
import type { Datatable } from '@kbn/expressions-plugin/public';
interface TableSelectorState {
  isPopoverOpen: boolean;
}
interface TableSelectorProps {
  tables: Datatable[];
  selectedTable: Datatable;
  onTableChanged: (table: Datatable) => void;
}
export declare class TableSelector extends Component<TableSelectorProps, TableSelectorState> {
  state: {
    isPopoverOpen: boolean;
  };
  togglePopover: () => void;
  closePopover: () => void;
  renderTableDropdownItem: (table: Datatable, index: number) => React.JSX.Element;
  render(): React.JSX.Element;
}
export {};
