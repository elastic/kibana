/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ModuleFile } from './module_files';
import {
  MAIN_FILE,
  buildModuleFiles,
  buildModuleZip,
  toResourceName,
  toZipFilename,
} from './module_files';
import { useTerraformExport } from './use_terraform_export';

export interface TerraformExportFlyoutProps {
  title: string;
  getExportJson: () => object;
  closeFlyout: () => void;
}

const DownloadFileButton = ({ name, content }: Pick<ModuleFile, 'name' | 'content'>) => {
  const label = i18n.translate('dashboard.exportTerraform.downloadFileLabel', {
    defaultMessage: 'Download {name}',
    values: { name },
  });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="download"
        size="xs"
        aria-label={label}
        onClick={() => downloadFileAs(name, { content, type: 'text/plain' })}
        data-test-subj={`dashboardTerraformExportDownloadFile-${name}`}
      />
    </EuiToolTip>
  );
};

const FileList = ({
  files,
  selected,
  onSelect,
}: {
  files: readonly ModuleFile[];
  selected: string;
  onSelect: (name: string) => void;
}) => (
  <ul
    aria-label={i18n.translate('dashboard.exportTerraform.fileListLabel', {
      defaultMessage: 'Module files',
    })}
  >
    {files.map(({ name, content }) => (
      <li key={name}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem css={{ alignItems: 'flex-start' }}>
            <EuiButtonEmpty
              size="s"
              flush="left"
              iconType="document"
              color={name === selected ? 'primary' : 'text'}
              aria-current={name === selected}
              onClick={() => onSelect(name)}
              data-test-subj={`dashboardTerraformExportFile-${name}`}
            >
              {name}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DownloadFileButton name={name} content={content} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </li>
    ))}
  </ul>
);

/** Export → Terraform: the files of a module creating a new copy of the dashboard. */
export const TerraformExportFlyout = ({
  title,
  getExportJson,
  closeFlyout,
}: TerraformExportFlyoutProps) => {
  const exportState = useTerraformExport(getExportJson);
  const resourceName = toResourceName(title);
  const conversion = exportState.status === 'success' ? exportState.conversion : undefined;
  const files = useMemo(
    () => (conversion ? buildModuleFiles(conversion, resourceName) : []),
    [conversion, resourceName]
  );
  const [selectedName, setSelectedName] = useState(MAIN_FILE);
  const selected = files.find(({ name }) => name === selectedName) ?? files[0];

  const onDownload = useCallback(async () => {
    await downloadFileAs(toZipFilename(title), await buildModuleZip(resourceName, files));
  }, [files, resourceName, title]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="dashboard.exportTerraform.flyoutTitle"
              defaultMessage="Export dashboard as Terraform"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('dashboard.exportTerraform.technicalPreviewBadgeLabel', {
                defaultMessage: 'Technical preview',
              })}
              tooltipContent={i18n.translate(
                'dashboard.exportTerraform.technicalPreviewBadgeTooltip',
                {
                  defaultMessage:
                    'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
                }
              )}
              size="s"
            />
          </EuiFlexItem>
          {conversion && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="dashboardTerraformExportProvider">
                {i18n.translate('dashboard.exportTerraform.providerBadge', {
                  defaultMessage: '{source} ≥ {version}',
                  values: {
                    source: conversion.provider.source,
                    version: conversion.provider.version,
                  },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="dashboard.exportTerraform.newCopyDescription"
                defaultMessage="Creates a new copy of {title} in Terraform JSON syntax ({extension})."
                values={{ title: <strong>{title}</strong>, extension: <EuiCode>.tf.json</EuiCode> }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {exportState.status === 'loading' && (
          <EuiFlexGroup justifyContent="center" alignItems="center" css={{ height: '100%' }}>
            <EuiLoadingSpinner
              size="xl"
              aria-label={i18n.translate('dashboard.exportTerraform.loadingLabel', {
                defaultMessage: 'Converting the dashboard',
              })}
            />
          </EuiFlexGroup>
        )}
        {exportState.status === 'error' && (
          <KbnDangerCallout
            title={i18n.translate('dashboard.exportTerraform.errorTitle', {
              defaultMessage: 'Export to Terraform failed',
            })}
            text={exportState.message}
            actionProps={{
              primary: {
                children: i18n.translate('dashboard.exportTerraform.retryButton', {
                  defaultMessage: 'Try again',
                }),
                onClick: exportState.retry,
              },
            }}
          />
        )}
        {selected && (
          <EuiFlexGroup gutterSize="m" responsive={false} css={{ minHeight: 0 }}>
            <EuiFlexItem grow={false} css={{ minWidth: 160 }}>
              <FileList files={files} selected={selected.name} onSelect={setSelectedName} />
            </EuiFlexItem>
            <EuiFlexItem css={{ minWidth: 0 }}>
              <EuiCodeBlock
                language={selected.language}
                isCopyable
                lineNumbers
                overflowHeight="65vh"
                fontSize="s"
                aria-label={selected.name}
                data-test-subj="dashboardTerraformExportFileContent"
              >
                {selected.content}
              </EuiCodeBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="dashboardTerraformExportClose">
              <FormattedMessage id="dashboard.exportTerraform.closeButton" defaultMessage="Close" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="download"
              onClick={onDownload}
              isDisabled={!files.length}
              data-test-subj="dashboardTerraformExportDownload"
            >
              <FormattedMessage
                id="dashboard.exportTerraform.downloadButton"
                defaultMessage="Download zip"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
