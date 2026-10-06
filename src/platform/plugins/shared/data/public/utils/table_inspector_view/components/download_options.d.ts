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
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
interface DataDownloadOptionsState {
  isPopoverOpen: boolean;
}
interface DataDownloadOptionsProps {
  title: string;
  datatables: Datatable[];
  uiSettings: IUiSettingsClient;
  isFormatted?: boolean;
  fieldFormats: FieldFormatsStart;
  missingValueDisplay?: 'text' | 'table';
}
declare class DataDownloadOptions extends Component<
  DataDownloadOptionsProps,
  DataDownloadOptionsState
> {
  state: {
    isPopoverOpen: boolean;
  };
  onTogglePopover: () => void;
  closePopover: () => void;
  exportCsv: (isFormatted?: boolean) => void;
  exportFormattedCsv: () => void;
  exportFormattedAsRawCsv: () => void;
  renderFormattedDownloads(): React.JSX.Element;
  render(): React.JSX.Element;
}
export { DataDownloadOptions };
