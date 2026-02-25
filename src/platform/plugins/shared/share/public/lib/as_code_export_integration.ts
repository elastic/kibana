/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiCodeProps, EuiIconProps } from '@elastic/eui';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { ExportShare, ExportGenerationOpts, RegisterShareIntegrationArgs } from '../types';
import { downloadFileAs } from './download_as';
import { AsCodeExportAssetPanel } from '../components/as_code_export_asset_panel';

export interface AsCodeExportFormat {
  /**
   * A human readable label for the format (e.g. "JSON", "Terraform HCL")
   */
  readonly label: string;
  /**
   * File extension including or excluding the leading dot (e.g. ".json" or "json")
   */
  readonly fileExtension: string;
  /**
   * MIME type for downloads (e.g. "application/json", "text/plain")
   */
  readonly mimeType: string;
  /**
   * EUI code block language (e.g. "json", "text")
   */
  readonly codeLanguage: EuiCodeProps['language'];
}

export interface CreateAsCodeExportShareIntegrationParams<
  SharingData extends object = Record<string, unknown>
> {
  readonly id: string;
  readonly exportType: string;
  readonly label: string;
  readonly icon?: EuiIconProps['type'];
  readonly sortOrder?: number;
  readonly format: AsCodeExportFormat;

  /**
   * Returns a filename base (without extension). The helper will sanitize it and append the format extension.
   */
  readonly getFilenameBase: (sharingData: SharingData) => string;

  /**
   * Returns the content to display in the flyout and download as a file.
   */
  readonly getContent: (sharingData: SharingData, opts: ExportGenerationOpts) => string;

  readonly copyAsset: {
    readonly headingText: string;
    readonly helpText?: string;
  };

  readonly download?: {
    readonly buttonLabel?: ReactNode;
  };
}

const DEFAULT_FILENAME_BASE = 'export';

function normalizeExtension(ext: string): string {
  const trimmed = ext.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function sanitizeFilenameBase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_FILENAME_BASE;

  // Remove control characters; replace commonly invalid filename characters.
  const withoutControlChars = trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
  const withoutInvalidChars = withoutControlChars.replace(/[\\/:*?"<>|]/g, '_');

  // Prevent pathological filenames (very long, empty after sanitization).
  const collapsedWhitespace = withoutInvalidChars.replace(/\s+/g, ' ').trim();
  return (collapsedWhitespace || DEFAULT_FILENAME_BASE).slice(0, 180);
}

export const createAsCodeExportShareIntegration = <
  SharingData extends object = Record<string, unknown>
>({
  id,
  exportType,
  label,
  icon = 'code',
  sortOrder,
  format,
  getFilenameBase,
  getContent,
  copyAsset,
  download,
}: CreateAsCodeExportShareIntegrationParams<SharingData>): RegisterShareIntegrationArgs<ExportShare> => {
  return {
    id,
    groupId: 'export',
    getShareIntegrationConfig: async ({ sharingData }) => {
      const typedSharingData = sharingData as unknown as SharingData;

      const getFileName = (filenameBase: string) => {
        const ext = normalizeExtension(format.fileExtension);
        return `${sanitizeFilenameBase(filenameBase)}${ext}`;
      };

      const getBody = (opts: ExportGenerationOpts) => getContent(typedSharingData, opts);

      return {
        id,
        name: id,
        icon,
        sortOrder,
        label,
        exportType,
        generateExportButtonLabel: download?.buttonLabel,
        generateAssetComponent: React.createElement(AsCodeExportAssetPanel, {
          headingText: copyAsset.headingText,
          helpText: copyAsset.helpText,
          language: format.codeLanguage,
          getValue: (intl: InjectedIntl) => getBody({ intl, optimizedForPrinting: false }),
          copyAriaLabel: i18n.translate('share.export.copyPostURLAriaLabel', {
            defaultMessage: 'Copy export asset value',
          }),
        }),
        generateAssetExport: async (opts) => {
          const filename = getFileName(getFilenameBase(typedSharingData));
          const content = getBody(opts);
          await downloadFileAs(filename, { content, type: format.mimeType });
        },
      };
    },
  };
};

