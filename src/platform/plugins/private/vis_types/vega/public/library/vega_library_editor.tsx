/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSuperDatePicker,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializableState, HasSerializedChildState } from '@kbn/presentation-publishing';
import { EmbeddableEditorPreview, ManagedEditorFooter } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { parse } from 'hjson';
import { BehaviorSubject } from 'rxjs';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import type { VegaByValueState, VegaReadResponseBody } from '../../server';
import { VegaEditorBody, vegaEditorFlyoutBodyCss } from '../components/vega_editor_body';
import { getDefaultSpec } from '../default_spec';
import { extractIndexPatternsFromSpec } from '../lib/extract_index_pattern';
import { fromDraft, isSameDraft, toDraft } from '../lib/library_draft';
import type { VegaDraft } from '../lib/library_draft';
import type { VegaPluginStartDependencies } from '../plugin';
import { getData } from '../services';
import { saveVegaToLibrary } from './save_to_library';
import type { VegaLibraryClient } from './vega_library_client';

type VegaPreviewApi = DefaultEmbeddableApi<VegaByValueState> &
  HasSerializableState<VegaByValueState>;
type VegaPreviewParentApi = HasSerializedChildState<VegaByValueState> & {
  timeRange$: BehaviorSubject<TimeRange | undefined>;
};

interface QuickRange {
  from: string;
  to: string;
  display: string;
}

const saveLabel = i18n.translate('visTypeVega.libraryEditor.saveButtonLabel', {
  defaultMessage: 'Save',
});

const closeLabel = i18n.translate('visTypeVega.libraryEditor.closeButtonLabel', {
  defaultMessage: 'Close',
});

const savedMessage = (title: string) =>
  i18n.translate('visTypeVega.libraryEditor.savedToast', {
    defaultMessage: 'Saved "{title}"',
    values: { title },
  });

export interface VegaLibraryEditorProps {
  core: Pick<CoreStart, 'notifications' | 'uiSettings'>;
  client: VegaLibraryClient;
  SearchBar: VegaPluginStartDependencies['unifiedSearch']['ui']['SearchBar'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  /** The item to edit. Without it, the editor creates a new item. */
  item?: { id: string; data: VegaReadResponseBody['data'] };
  defaultDataView?: DataView;
  /** Whether the user may save library items. Without it, the editor can still be used to explore. */
  canSave: boolean;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

const getSpecDataViews = async (specText: string): Promise<DataView[]> => {
  try {
    return await extractIndexPatternsFromSpec(
      parse(specText, { legacyRoot: false, keepWsc: true })
    );
  } catch {
    // A spec that doesn't parse names no data views.
    return [];
  }
};

export const VegaLibraryEditor = ({
  core,
  client,
  SearchBar,
  savedObjectsTagging,
  item,
  defaultDataView,
  canSave,
  closeFlyout,
  ariaLabelledBy,
}: VegaLibraryEditorProps) => {
  const initialDraft = useMemo<VegaDraft>(
    () => toDraft(item?.data ?? { spec: { format: 'hjson', value: getDefaultSpec() } }),
    [item]
  );
  const [draft, setDraft] = useState(initialDraft);
  const [previewedDraft, setPreviewedDraft] = useState(initialDraft);
  const [specDataViews, setSpecDataViews] = useState<DataView[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const isExisting = item !== undefined;
  const isDirty = !isSameDraft(draft, initialDraft);
  const canPreview = !isSameDraft(draft, previewedDraft);
  const dataViews = specDataViews.length ? specDataViews : defaultDataView ? [defaultDataView] : [];

  // The data views follow the previewed spec, so they don't resolve on every keystroke.
  useEffect(() => {
    let isCurrent = true;
    getSpecDataViews(previewedDraft.spec).then((resolved) => {
      if (isCurrent) setSpecDataViews(resolved);
    });
    return () => {
      isCurrent = false;
    };
  }, [previewedDraft.spec]);

  // The library has no dashboard to take a time range from, so the preview has its own.
  const timeRange$ = useMemo(
    () =>
      new BehaviorSubject<TimeRange | undefined>(getData().query.timefilter.timefilter.getTime()),
    []
  );
  const [timeRange, setTimeRange] = useState(timeRange$.getValue());
  const getPreviewParentApi = useCallback(() => ({ timeRange$ }), [timeRange$]);
  const quickRanges = useMemo(
    () =>
      core.uiSettings
        .get<QuickRange[]>(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
        .map(({ from, to, display }) => ({ start: from, end: to, label: display })),
    [core.uiSettings]
  );

  const previewState = useMemo(() => fromDraft(previewedDraft), [previewedDraft]);

  const reportSaveError = (error: Error) =>
    core.notifications.toasts.addError(error, {
      title: i18n.translate('visTypeVega.libraryEditor.saveErrorTitle', {
        defaultMessage: 'Unable to save Vega visualization',
      }),
    });

  const saveAsNewItem = async (initialDetails?: Partial<VegaReadResponseBody['data']>) => {
    setIsSaving(true);
    try {
      const created = await saveVegaToLibrary({
        client,
        state: fromDraft(draft),
        initialDetails,
        savedObjectsTagging,
      });
      if (!created) return;
      core.notifications.toasts.addSuccess(savedMessage(created.title));
      closeFlyout();
    } catch (error) {
      reportSaveError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveChanges = async () => {
    if (!item) {
      await saveAsNewItem();
      return;
    }
    setIsSaving(true);
    try {
      // The API replaces the whole item, so keep what the editor doesn't change.
      await client.update(item.id, { ...item.data, ...fromDraft(draft) });
      core.notifications.toasts.addSuccess(savedMessage(item.data.title));
      closeFlyout();
    } catch (error) {
      reportSaveError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const onCancel = () => {
    if (canSave && isDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    closeFlyout();
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={ariaLabelledBy}>
                {item
                  ? i18n.translate('visTypeVega.libraryEditor.editTitle', {
                      defaultMessage: 'Edit Vega visualization: {title}',
                      values: { title: item.data.title },
                    })
                  : i18n.translate('visTypeVega.libraryEditor.createTitle', {
                      defaultMessage: 'Create Vega visualization',
                    })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {canSave ? null : (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('visTypeVega.libraryEditor.readOnlyTooltip', {
                  defaultMessage: 'Unable to save visualizations to the library',
                })}
              >
                <EuiBadge
                  tabIndex={0}
                  color="hollow"
                  iconType="lock"
                  data-test-subj="vegaLibraryEditorReadOnlyBadge"
                >
                  {i18n.translate('visTypeVega.libraryEditor.readOnlyBadge', {
                    defaultMessage: 'Read only',
                  })}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="vegaLibraryEditorBody" css={vegaEditorFlyoutBodyCss}>
        <VegaEditorBody
          SearchBar={SearchBar}
          dataViews={dataViews}
          query={draft.query}
          filters={draft.filters}
          onQueryChange={(query) => setDraft((current) => ({ ...current, query }))}
          onFiltersChange={(filters) => setDraft((current) => ({ ...current, filters }))}
          spec={draft.spec}
          initialFormat={initialDraft.format}
          onSpecChange={(spec) => setDraft((current) => ({ ...current, spec }))}
          onFormatChange={(format) => setDraft((current) => ({ ...current, format }))}
        />
      </EuiFlyoutBody>
      <ManagedEditorFooter
        onCancel={onCancel}
        cancelButtonLabel={canSave ? undefined : closeLabel}
        cancelButtonDataTestSubj="vegaLibraryEditorCancelButton"
        previewAction={{
          onPreview: () => setPreviewedDraft(draft),
          isEnabled: canPreview,
          'data-test-subj': 'vegaLibraryEditorPreviewButton',
        }}
        hideSave={!canSave}
        onSave={saveChanges}
        saveButtonLabel={saveLabel}
        isSaveDisabled={isExisting && !isDirty}
        isSaving={isSaving}
        saveButtonDataTestSubj="vegaLibraryEditorSaveButton"
        saveMenuItems={
          item
            ? [
                {
                  name: i18n.translate('visTypeVega.libraryEditor.saveAsNewButtonLabel', {
                    defaultMessage: 'Save as new…',
                  }),
                  onClick: () =>
                    saveAsNewItem({
                      title: item.data.title,
                      description: item.data.description,
                      tags: item.data.tags,
                    }),
                  'data-test-subj': 'vegaLibraryEditorSaveAsNewButton',
                },
              ]
            : undefined
        }
      />
      <EmbeddableEditorPreview<VegaByValueState, VegaPreviewApi, VegaPreviewParentApi>
        type={VEGA_EMBEDDABLE_TYPE}
        serializedState={previewState}
        getParentApi={getPreviewParentApi}
        toolbar={
          <EuiSuperDatePicker
            start={timeRange?.from}
            end={timeRange?.to}
            onTimeChange={({ start, end }) => {
              const next = { from: start, to: end };
              setTimeRange(next);
              timeRange$.next(next);
            }}
            commonlyUsedRanges={quickRanges}
            showUpdateButton={false}
            width="full"
            data-test-subj="vegaLibraryEditorPreviewTimePicker"
          />
        }
      />
      {isDiscardConfirmOpen ? (
        <EuiConfirmModal
          aria-labelledby="vegaLibraryEditorDiscardTitle"
          title={i18n.translate('visTypeVega.libraryEditor.discardModalTitle', {
            defaultMessage: 'Discard unsaved changes?',
          })}
          titleProps={{ id: 'vegaLibraryEditorDiscardTitle' }}
          onCancel={() => setIsDiscardConfirmOpen(false)}
          onConfirm={() => {
            setIsDiscardConfirmOpen(false);
            closeFlyout();
          }}
          cancelButtonText={i18n.translate('visTypeVega.libraryEditor.discardModalKeepEditing', {
            defaultMessage: 'Keep editing',
          })}
          confirmButtonText={i18n.translate('visTypeVega.libraryEditor.discardModalConfirm', {
            defaultMessage: 'Discard changes',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="vegaLibraryEditorDiscardModal"
        >
          <p>
            {i18n.translate('visTypeVega.libraryEditor.discardModalDescription', {
              defaultMessage: "You can't recover unsaved changes.",
            })}
          </p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
