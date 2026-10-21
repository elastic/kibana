/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart, CoreStart, HttpStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

type ToastsStart = CoreStart['notifications']['toasts'];
import { useContentListState } from '@kbn/content-list';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { withDataManagementOverviewReturn } from '../../common/data_management_overview_return';
import {
  clearIndexCache,
  closeIndex,
  deleteDataStream,
  deleteDataset,
  deleteEsqlView,
  deleteIndex,
  deleteStream,
  flushIndex,
  forceMergeIndex,
  openIndex,
  refreshIndex,
} from './resource_action_client';
import type { DataManagementResource } from './sample_resources';

type GetUrlForApp = ApplicationStart['getUrlForApp'];

type ConfirmKind =
  | 'deleteIndex'
  | 'forceMerge'
  | 'deleteDataStream'
  | 'deleteStream'
  | 'deleteView'
  | 'deleteDataset';

interface MenuItem {
  id: string;
  name: string;
  icon: string;
  href?: string;
  color?: 'danger';
  onClick?: () => void;
}

const openInDiscoverLabel = i18n.translate(
  'management.dataManagementOverview.actions.openInDiscover',
  { defaultMessage: 'Open in Discover' }
);

const actionsLabel = (name: string) =>
  i18n.translate('management.dataManagementOverview.actions.menuAriaLabel', {
    defaultMessage: 'Actions for {name}',
    values: { name },
  });

const cancelLabel = i18n.translate('management.dataManagementOverview.actions.cancel', {
  defaultMessage: 'Cancel',
});

const deleteLabel = i18n.translate('management.dataManagementOverview.actions.delete', {
  defaultMessage: 'Delete',
});

const quoteEsqlSource = (name: string): string => {
  if (!/[:"=|,[\]/ \t\r\n]/.test(name)) {
    return name;
  }
  const escaped = name
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
};

const readErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    if (
      'body' in error &&
      typeof error.body === 'object' &&
      error.body !== null &&
      'message' in error.body &&
      typeof error.body.message === 'string'
    ) {
      return error.body.message;
    }
    if ('message' in error && typeof error.message === 'string' && error.message.length > 0) {
      return error.message;
    }
  }
  return i18n.translate('management.dataManagementOverview.actions.failed', {
    defaultMessage: 'The action could not be completed.',
  });
};

const managementPath = (getUrlForApp: GetUrlForApp, path: string) =>
  getUrlForApp('management', { path: withDataManagementOverviewReturn(path) });

const indexDetailsHref = (getUrlForApp: GetUrlForApp, name: string, tab: string) =>
  managementPath(
    getUrlForApp,
    `/data/index_management/indices/index_details?indexName=${encodeURIComponent(name)}&tab=${tab}`
  );

export const ResourceRowActions = ({
  resource,
  getUrlForApp,
  http,
  share,
  toasts,
  onEditEsqlView,
}: {
  resource: DataManagementResource;
  getUrlForApp: GetUrlForApp;
  http: HttpStart;
  share: SharePluginStart;
  toasts: ToastsStart;
  onEditEsqlView: (name: string) => void;
}) => {
  const { refresh } = useContentListState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind | undefined>();
  const [segments, setSegments] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const confirmTitleId = useGeneratedHtmlId({ prefix: 'dataManagementOverviewConfirm' });
  const { title: name } = resource;
  const discoverLocator = share.url.locators.get<{
    query: { esql: string };
  }>('DISCOVER_APP_LOCATOR');

  const closeMenu = () => setIsMenuOpen(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setIsWorking(true);
    try {
      await action();
      toasts.addSuccess(success);
      setConfirm(undefined);
      await refresh();
    } catch (error) {
      toasts.addDanger(readErrorMessage(error));
    } finally {
      setIsWorking(false);
    }
  };

  const ask = (kind: ConfirmKind) => {
    closeMenu();
    setSegments('');
    setConfirm(kind);
  };

  const indexIsOpen = resource.indexStatus === undefined || resource.indexStatus === 'open';
  const items = menuItems({
    resource,
    indexIsOpen,
    getUrlForApp,
    http,
    onEditEsqlView,
    ask,
    runImmediate: (action, success) => {
      closeMenu();
      void run(action, success);
    },
  });

  const openDiscover = () => {
    if (!discoverLocator) {
      return;
    }
    // Discover opens on an ES|QL query in this app, same as streams, views, and datasets.
    void discoverLocator.navigate({ query: { esql: `FROM ${quoteEsqlSource(name)}` } });
  };

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexEnd" responsive={false}>
        <EuiToolTip content={openInDiscoverLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={i18n.translate(
              'management.dataManagementOverview.actions.openInDiscoverAriaLabel',
              {
                defaultMessage: 'Open {name} in Discover',
                values: { name },
              }
            )}
            color="text"
            data-test-subj={`dataManagementOverviewDiscoverButton-${name}`}
            disabled={!discoverLocator}
            iconType="productDiscover"
            onClick={openDiscover}
          />
        </EuiToolTip>
        <EuiPopover
          aria-label={actionsLabel(name)}
          button={
            <EuiToolTip content={actionsLabel(name)} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={actionsLabel(name)}
                color="text"
                data-test-subj={`dataManagementOverviewActionsButton-${name}`}
                iconType="boxesVertical"
                onClick={() => setIsMenuOpen((open) => !open)}
              />
            </EuiToolTip>
          }
          closePopover={closeMenu}
          isOpen={isMenuOpen}
          panelPaddingSize="none"
          anchorPosition="leftCenter"
        >
          <EuiContextMenuPanel
            items={items.map((item) => (
              <EuiContextMenuItem
                key={item.id}
                icon={item.icon}
                color={item.color}
                href={item.href}
                data-test-subj={`dataManagementOverviewAction-${item.id}`}
                onClick={() => {
                  closeMenu();
                  item.onClick?.();
                }}
              >
                {item.name}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      </EuiFlexGroup>
      {confirm ? (
        <ConfirmAction
          kind={confirm}
          name={name}
          titleId={confirmTitleId}
          isWorking={isWorking}
          segments={segments}
          onSegmentsChange={setSegments}
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => {
            const action = confirmAction(http, name, confirm, segments);
            if (action) {
              void run(action.request, action.success);
            }
          }}
        />
      ) : null}
    </>
  );
};

const menuItems = ({
  resource,
  indexIsOpen,
  getUrlForApp,
  http,
  onEditEsqlView,
  ask,
  runImmediate,
}: {
  resource: DataManagementResource;
  indexIsOpen: boolean;
  getUrlForApp: GetUrlForApp;
  http: HttpStart;
  onEditEsqlView: (name: string) => void;
  ask: (kind: ConfirmKind) => void;
  runImmediate: (action: () => Promise<unknown>, success: string) => void;
}): MenuItem[] => {
  const { title: name } = resource;

  switch (resource.kind) {
    case 'index':
      return [
        {
          id: 'showOverview',
          name: i18n.translate('management.dataManagementOverview.actions.showIndexOverview', {
            defaultMessage: 'Show index overview',
          }),
          icon: 'eye',
          href: indexDetailsHref(getUrlForApp, name, 'overview'),
        },
        {
          id: 'showSettings',
          name: i18n.translate('management.dataManagementOverview.actions.showIndexSettings', {
            defaultMessage: 'Show index settings',
          }),
          icon: 'gear',
          href: indexDetailsHref(getUrlForApp, name, 'settings'),
        },
        {
          id: 'showMappings',
          name: i18n.translate('management.dataManagementOverview.actions.showIndexMappings', {
            defaultMessage: 'Show index mapping',
          }),
          icon: 'visTable',
          href: indexDetailsHref(getUrlForApp, name, 'mappings'),
        },
        ...(indexIsOpen
          ? [
              {
                id: 'showStats',
                name: i18n.translate('management.dataManagementOverview.actions.showIndexStats', {
                  defaultMessage: 'Show index stats',
                }),
                icon: 'stats',
                href: indexDetailsHref(getUrlForApp, name, 'stats'),
              },
              {
                id: 'closeIndex',
                name: i18n.translate('management.dataManagementOverview.actions.closeIndex', {
                  defaultMessage: 'Close index',
                }),
                icon: 'lock',
                onClick: () =>
                  runImmediate(
                    () => closeIndex(http, name),
                    i18n.translate('management.dataManagementOverview.actions.closedIndex', {
                      defaultMessage: 'Closed index {name}',
                      values: { name },
                    })
                  ),
              },
              {
                id: 'forceMerge',
                name: i18n.translate('management.dataManagementOverview.actions.forceMergeIndex', {
                  defaultMessage: 'Force merge index',
                }),
                icon: 'merge',
                onClick: () => ask('forceMerge'),
              },
              {
                id: 'refreshIndex',
                name: i18n.translate('management.dataManagementOverview.actions.refreshIndex', {
                  defaultMessage: 'Refresh index',
                }),
                icon: 'refresh',
                onClick: () =>
                  runImmediate(
                    () => refreshIndex(http, name),
                    i18n.translate('management.dataManagementOverview.actions.refreshedIndex', {
                      defaultMessage: 'Refreshed index {name}',
                      values: { name },
                    })
                  ),
              },
              {
                id: 'clearCache',
                name: i18n.translate('management.dataManagementOverview.actions.clearIndexCache', {
                  defaultMessage: 'Clear index cache',
                }),
                icon: 'broom',
                onClick: () =>
                  runImmediate(
                    () => clearIndexCache(http, name),
                    i18n.translate('management.dataManagementOverview.actions.clearedIndexCache', {
                      defaultMessage: 'Cleared cache for index {name}',
                      values: { name },
                    })
                  ),
              },
              {
                id: 'flushIndex',
                name: i18n.translate('management.dataManagementOverview.actions.flushIndex', {
                  defaultMessage: 'Flush index',
                }),
                icon: 'storage',
                onClick: () =>
                  runImmediate(
                    () => flushIndex(http, name),
                    i18n.translate('management.dataManagementOverview.actions.flushedIndex', {
                      defaultMessage: 'Flushed index {name}',
                      values: { name },
                    })
                  ),
              },
            ]
          : [
              {
                id: 'openIndex',
                name: i18n.translate('management.dataManagementOverview.actions.openIndex', {
                  defaultMessage: 'Open index',
                }),
                icon: 'lockOpen',
                onClick: () =>
                  runImmediate(
                    () => openIndex(http, name),
                    i18n.translate('management.dataManagementOverview.actions.openedIndex', {
                      defaultMessage: 'Opened index {name}',
                      values: { name },
                    })
                  ),
              },
            ]),
        {
          id: 'deleteIndex',
          name: i18n.translate('management.dataManagementOverview.actions.deleteIndex', {
            defaultMessage: 'Delete index',
          }),
          icon: 'trash',
          color: 'danger',
          onClick: () => ask('deleteIndex'),
        },
      ];
    case 'dataStream':
      return [
        {
          id: 'editDataLifecycle',
          name: i18n.translate('management.dataManagementOverview.actions.editDataLifecycle', {
            defaultMessage: 'Edit data lifecycle',
          }),
          icon: 'gear',
          href: managementPath(
            getUrlForApp,
            `/data/index_management/data_streams/${encodeURIComponent(name)}?editLifecycle=1`
          ),
        },
        {
          id: 'deleteDataStream',
          name: deleteLabel,
          icon: 'trash',
          color: 'danger',
          onClick: () => ask('deleteDataStream'),
        },
      ];
    case 'stream':
      return [
        {
          id: 'deleteStream',
          name: i18n.translate('management.dataManagementOverview.actions.deleteStream', {
            defaultMessage: 'Delete stream',
          }),
          icon: 'trash',
          color: 'danger',
          onClick: () => ask('deleteStream'),
        },
      ];
    case 'esqlView':
      return [
        {
          id: 'editView',
          name: i18n.translate('management.dataManagementOverview.actions.edit', {
            defaultMessage: 'Edit',
          }),
          icon: 'pencil',
          onClick: () => onEditEsqlView(name),
        },
        {
          id: 'deleteView',
          name: deleteLabel,
          icon: 'trash',
          color: 'danger',
          onClick: () => ask('deleteView'),
        },
      ];
    case 'dataset':
      return [
        {
          id: 'editDataset',
          name: i18n.translate('management.dataManagementOverview.actions.editDataset', {
            defaultMessage: 'Edit',
          }),
          icon: 'pencil',
          href: managementPath(
            getUrlForApp,
            `/data/data_federation/datasets/edit/${encodeURIComponent(name)}`
          ),
        },
        {
          id: 'deleteDataset',
          name: deleteLabel,
          icon: 'trash',
          color: 'danger',
          onClick: () => ask('deleteDataset'),
        },
      ];
  }
};

const confirmAction = (
  http: HttpStart,
  name: string,
  kind: ConfirmKind,
  segments: string
): { request: () => Promise<unknown>; success: string } | undefined => {
  switch (kind) {
    case 'deleteIndex':
      return {
        request: () => deleteIndex(http, name),
        success: i18n.translate('management.dataManagementOverview.actions.deletedIndex', {
          defaultMessage: 'Deleted index {name}',
          values: { name },
        }),
      };
    case 'forceMerge': {
      const maxNumSegments = /^[1-9]\d*$/.test(segments.trim()) ? segments.trim() : '1';
      return {
        request: () => forceMergeIndex(http, name, maxNumSegments),
        success: i18n.translate('management.dataManagementOverview.actions.forceMergedIndex', {
          defaultMessage: 'Force merged index {name}',
          values: { name },
        }),
      };
    }
    case 'deleteDataStream':
      return {
        request: () => deleteDataStream(http, name),
        success: i18n.translate('management.dataManagementOverview.actions.deletedDataStream', {
          defaultMessage: 'Deleted data stream {name}',
          values: { name },
        }),
      };
    case 'deleteStream':
      return {
        request: () => deleteStream(http, name),
        success: i18n.translate('management.dataManagementOverview.actions.deletedStream', {
          defaultMessage: 'Deleted stream {name}',
          values: { name },
        }),
      };
    case 'deleteView':
      return {
        request: () => deleteEsqlView(http, name),
        success: i18n.translate('management.dataManagementOverview.actions.deletedView', {
          defaultMessage: 'Deleted ES|QL view {name}',
          values: { name },
        }),
      };
    case 'deleteDataset':
      return {
        request: () => deleteDataset(http, name),
        success: i18n.translate('management.dataManagementOverview.actions.deletedDataset', {
          defaultMessage: 'Deleted dataset {name}',
          values: { name },
        }),
      };
  }
};

const ConfirmAction = ({
  kind,
  name,
  titleId,
  isWorking,
  segments,
  onSegmentsChange,
  onCancel,
  onConfirm,
}: {
  kind: ConfirmKind;
  name: string;
  titleId: string;
  isWorking: boolean;
  segments: string;
  onSegmentsChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const copy = confirmCopy(kind, name);
  const segmentsInvalid = segments.trim() !== '' && !/^[1-9]\d*$/.test(segments.trim());

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      title={copy.title}
      titleProps={{ id: titleId }}
      buttonColor={kind === 'forceMerge' ? 'primary' : 'danger'}
      cancelButtonText={cancelLabel}
      confirmButtonText={copy.confirm}
      confirmButtonDisabled={isWorking || (kind === 'forceMerge' && segmentsInvalid)}
      isLoading={isWorking}
      onCancel={onCancel}
      onConfirm={onConfirm}
      data-test-subj="dataManagementOverviewConfirmModal"
    >
      {copy.body}
      {kind === 'forceMerge' ? (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate(
              'management.dataManagementOverview.actions.forceMergeSegmentsLabel',
              { defaultMessage: 'Maximum number of segments per shard' }
            )}
            isInvalid={segmentsInvalid}
            error={
              segmentsInvalid
                ? i18n.translate(
                    'management.dataManagementOverview.actions.forceMergeSegmentsError',
                    { defaultMessage: 'Enter a whole number greater than zero.' }
                  )
                : undefined
            }
          >
            <EuiFieldNumber
              isInvalid={segmentsInvalid}
              min={1}
              value={segments}
              onChange={(event) => onSegmentsChange(event.target.value)}
              data-test-subj="dataManagementOverviewForceMergeSegments"
            />
          </EuiFormRow>
        </>
      ) : null}
    </EuiConfirmModal>
  );
};

const confirmCopy = (
  kind: ConfirmKind,
  name: string
): { title: string; confirm: string; body: React.ReactNode } => {
  switch (kind) {
    case 'deleteIndex':
      return {
        title: i18n.translate('management.dataManagementOverview.actions.deleteIndexTitle', {
          defaultMessage: 'Delete index',
        }),
        confirm: i18n.translate('management.dataManagementOverview.actions.deleteIndexConfirm', {
          defaultMessage: 'Delete index',
        }),
        body: (
          <p>
            {i18n.translate('management.dataManagementOverview.actions.deleteIndexBody', {
              defaultMessage:
                'You are about to delete {name}. You can’t recover a deleted index. Make sure you have appropriate backups.',
              values: { name },
            })}
          </p>
        ),
      };
    case 'forceMerge':
      return {
        title: i18n.translate('management.dataManagementOverview.actions.forceMergeTitle', {
          defaultMessage: 'Force merge',
        }),
        confirm: i18n.translate('management.dataManagementOverview.actions.forceMergeConfirm', {
          defaultMessage: 'Force merge',
        }),
        body: (
          <>
            <p>
              {i18n.translate('management.dataManagementOverview.actions.forceMergeBody', {
                defaultMessage: 'You are about to force merge {name}.',
                values: { name },
              })}
            </p>
            <KbnWarningCallout
              title={i18n.translate(
                'management.dataManagementOverview.actions.forceMergeWarningTitle',
                { defaultMessage: 'Proceed with caution!' }
              )}
            >
              {i18n.translate('management.dataManagementOverview.actions.forceMergeWarning', {
                defaultMessage:
                  'Don’t force-merge an index you are still writing to. Writing to a force-merged index can make its performance much worse.',
              })}
            </KbnWarningCallout>
          </>
        ),
      };
    case 'deleteDataStream':
      return {
        title: i18n.translate('management.dataManagementOverview.actions.deleteDataStreamTitle', {
          defaultMessage: 'Delete data stream',
        }),
        confirm: deleteLabel,
        body: (
          <KbnDangerCallout
            title={i18n.translate(
              'management.dataManagementOverview.actions.deleteDataStreamWarningTitle',
              { defaultMessage: 'Deleting a data stream also deletes its indices' }
            )}
          >
            {i18n.translate('management.dataManagementOverview.actions.deleteDataStreamWarning', {
              defaultMessage:
                'You are about to delete {name}. Deleting a data stream also deletes the indices it contains.',
              values: { name },
            })}
          </KbnDangerCallout>
        ),
      };
    case 'deleteStream':
      return {
        title: i18n.translate('management.dataManagementOverview.actions.deleteStreamTitle', {
          defaultMessage: 'Delete stream',
        }),
        confirm: deleteLabel,
        body: (
          <p>
            {i18n.translate('management.dataManagementOverview.actions.deleteStreamBody', {
              defaultMessage:
                'Are you sure you want to delete {name}? This deletes the stream and its underlying data stream.',
              values: { name },
            })}
          </p>
        ),
      };
    case 'deleteView':
      return {
        title: i18n.translate('management.dataManagementOverview.actions.deleteViewTitle', {
          defaultMessage: 'Delete view "{name}"?',
          values: { name },
        }),
        confirm: deleteLabel,
        body: (
          <p>
            {i18n.translate('management.dataManagementOverview.actions.deleteViewBody', {
              defaultMessage:
                'This permanently deletes the view from Elasticsearch. Any query that references this view will fail, including queries in dashboards, alerts, and other saved objects.',
            })}
          </p>
        ),
      };
    case 'deleteDataset':
      return {
        title: i18n.translate('management.dataManagementOverview.actions.deleteDatasetTitle', {
          defaultMessage: 'Delete dataset',
        }),
        confirm: deleteLabel,
        body: (
          <p>
            {i18n.translate('management.dataManagementOverview.actions.deleteDatasetBody', {
              defaultMessage:
                'Are you sure you want to delete {name}? This action cannot be undone.',
              values: { name },
            })}
          </p>
        ),
      };
  }
};
