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
  EuiButtonGroup,
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
  useEuiPaddingSize,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ExportMode, ModuleFile } from './module_files';
import { MAIN_FILE, buildModuleFiles, buildModuleZip, toZipFilename } from './module_files';
import { listProblems, ProblemsCallout } from './problems_callout';
import { useTerraformExport } from './use_terraform_export';

export interface TerraformExportFlyoutProps {
  title: string;
  /** The saved dashboard's ID; without one the dashboard can only be exported as a new copy. */
  dashboardId?: string;
  isDirty: boolean;
  getExportJson: () => object;
  closeFlyout: () => void;
}

type ModeKind = ExportMode['kind'];

const modeOptions = (canAdopt: boolean) => [
  {
    id: 'adopt',
    label: i18n.translate('dashboard.exportTerraform.adoptModeButtonLabel', {
      defaultMessage: 'Adopt this dashboard',
    }),
    isDisabled: !canAdopt,
    toolTipContent: canAdopt
      ? undefined
      : i18n.translate('dashboard.exportTerraform.adoptUnavailableTooltip', {
          defaultMessage: 'Save the dashboard to adopt it.',
        }),
    'data-test-subj': 'dashboardTerraformExportModeAdopt',
  },
  {
    id: 'copy',
    label: i18n.translate('dashboard.exportTerraform.copyModeButtonLabel', {
      defaultMessage: 'New copy',
    }),
    'data-test-subj': 'dashboardTerraformExportModeCopy',
  },
];

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

/** Export → Terraform: the files of a module adopting the dashboard or creating a new copy. */
export const TerraformExportFlyout = ({
  title,
  dashboardId,
  isDirty,
  getExportJson,
  closeFlyout,
}: TerraformExportFlyoutProps) => {
  const exportState = useTerraformExport(getExportJson);
  const canAdopt = Boolean(dashboardId);
  const [modeKind, setModeKind] = useState<ModeKind>(canAdopt ? 'adopt' : 'copy');
  const conversion = exportState.status === 'success' ? exportState.conversion : undefined;
  const spaceId = exportState.status === 'success' ? exportState.spaceId : undefined;
  const mode = useMemo((): ExportMode | undefined => {
    if (!spaceId) return undefined;
    return modeKind === 'adopt' && dashboardId
      ? { kind: 'adopt', spaceId, dashboardId }
      : { kind: 'copy' };
  }, [dashboardId, modeKind, spaceId]);
  const files = useMemo(
    () => (conversion && mode ? buildModuleFiles(conversion, mode) : []),
    [conversion, mode]
  );
  const [selectedName, setSelectedName] = useState(MAIN_FILE);
  const selected = files.find(({ name }) => name === selectedName) ?? files[0];

  const [isProblemsDismissed, setIsProblemsDismissed] = useState(false);
  const problems = useMemo(
    () =>
      exportState.status === 'success' && mode
        ? listProblems({
            conversion: exportState.conversion,
            sanitized: exportState.sanitized,
            isDirty,
            isSaved: canAdopt,
            mode,
          })
        : [],
    [canAdopt, exportState, isDirty, mode]
  );

  const showProblems = problems.length > 0 && !isProblemsDismissed;

  // The body's scroll area holds the problems banner and the files; the code fills what the banner leaves, so the
  // body itself does not scroll. The banner and the files each have the body padding above them, the files also below.
  const [scrollArea, setScrollArea] = useState<HTMLDivElement | null>(null);
  const [banner, setBanner] = useState<HTMLDivElement | null>(null);
  const { height: scrollAreaHeight } = useResizeObserver(scrollArea, 'height');
  const { height: bannerHeight } = useResizeObserver(banner, 'height');
  const bodyPadding = parseFloat(useEuiPaddingSize('l') ?? '0');
  const bannerSpace = showProblems ? bannerHeight + bodyPadding : 0;
  const codeHeight =
    scrollAreaHeight > 0 ? Math.max(scrollAreaHeight - bannerSpace - 2 * bodyPadding, 120) : '65vh';

  const onDownload = useCallback(async () => {
    if (!conversion) return;
    await downloadFileAs(
      toZipFilename(title),
      await buildModuleZip(conversion.resource_name, files)
    );
  }, [conversion, files, title]);

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
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('dashboard.exportTerraform.modeAriaLabel', {
                defaultMessage: 'What Terraform does with the dashboard',
              })}
              buttonSize="compressed"
              idSelected={modeKind}
              onChange={(id) => setModeKind(id as ModeKind)}
              options={modeOptions(canAdopt)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="dashboardTerraformExportModeText">
              {modeKind === 'adopt' ? (
                <FormattedMessage
                  id="dashboard.exportTerraform.adoptDescription"
                  defaultMessage="Terraform imports {title} and updates it in place. Terraform JSON syntax ({extension})."
                  values={{
                    title: <strong>{title}</strong>,
                    extension: <EuiCode>.tf.json</EuiCode>,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="dashboard.exportTerraform.newCopyDescription"
                  defaultMessage="Creates a new copy of {title}; the original is not changed. Terraform JSON syntax ({extension})."
                  values={{
                    title: <strong>{title}</strong>,
                    extension: <EuiCode>.tf.json</EuiCode>,
                  }}
                />
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        scrollContainerRef={setScrollArea}
        banner={
          showProblems ? (
            <div ref={setBanner}>
              <ProblemsCallout problems={problems} onDismiss={() => setIsProblemsDismissed(true)} />
            </div>
          ) : undefined
        }
      >
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
                overflowHeight={codeHeight}
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
