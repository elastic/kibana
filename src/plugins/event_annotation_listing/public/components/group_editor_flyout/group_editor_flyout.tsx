/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  htmlIdGenerator,
  useIsWithinBreakpoints,
  EuiButtonIcon,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import type {
  EventAnnotationConfig,
  EventAnnotationGroupConfig,
} from '@kbn/event-annotation-common';
import { css } from '@emotion/react';
import type { EmbeddableComponent as LensEmbeddableComponent } from '@kbn/lens-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { GroupEditorControls, isGroupValid } from './group_editor_controls';
import { GroupPreview } from './group_preview';

export const GroupEditorFlyout = ({
  group,
  updateGroup,
  onClose: parentOnClose,
  onSave,
  savedObjectsTagging,
  dataViews: globalDataViews,
  createDataView,
  LensEmbeddableComponent,
  queryInputServices,
  searchSessionId,
  refreshSearchSession,
  timePickerQuickRanges,
}: {
  group: EventAnnotationGroupConfig;
  updateGroup: (newGroup: EventAnnotationGroupConfig) => void;
  onClose: () => void;
  onSave: () => void;
  savedObjectsTagging: SavedObjectsTaggingApi;
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  LensEmbeddableComponent: LensEmbeddableComponent;
  queryInputServices: QueryInputServices;
  searchSessionId: string;
  refreshSearchSession: () => void;
  timePickerQuickRanges: Array<{ from: string; to: string; display: string }> | undefined;
}) => {
  const flyoutHeadingId = useMemo(() => htmlIdGenerator()(), []);
  const flyoutBodyOverflowRef = useRef<Element | null>(null);
  useEffect(() => {
    if (!flyoutBodyOverflowRef.current) {
      flyoutBodyOverflowRef.current = document.querySelector('.euiFlyoutBody__overflow');
    }
  }, []);

  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  const resetContentScroll = useCallback(
    () => flyoutBodyOverflowRef.current && flyoutBodyOverflowRef.current.scroll(0, 0),
    []
  );

  // save the spec for the life of the component since the user might change their mind after selecting another data view
  const [adHocDataView, setAdHocDataView] = useState<DataView>();

  useEffect(() => {
    if (group.dataViewSpec) {
      createDataView(group.dataViewSpec).then(setAdHocDataView);
    }
  }, [createDataView, group.dataViewSpec]);

  const dataViews = useMemo(() => {
    const items = [...globalDataViews];
    if (adHocDataView) {
      items.push(adHocDataView);
    }
    return items;
  }, [adHocDataView, globalDataViews]);

  const [selectedAnnotation, _setSelectedAnnotation] = useState<EventAnnotationConfig>();
  const setSelectedAnnotation = useCallback(
    (newValue: EventAnnotationConfig | undefined) => {
      if ((!newValue && selectedAnnotation) || (newValue && !selectedAnnotation))
        resetContentScroll();
      _setSelectedAnnotation(newValue);
    },
    [resetContentScroll, selectedAnnotation]
  );
  const onClose = () => (selectedAnnotation ? setSelectedAnnotation(undefined) : parentOnClose());

  const showPreview = !useIsWithinBreakpoints(['xs', 's', 'm']);

  return (
    <EuiFlyout
      onClose={onClose}
      paddingSize="m"
      size="l"
      hideCloseButton
      outsideClickCloses={false}
    >
      <EuiFlexGroup
        css={css`
          height: 100%;
          overflow-y: auto;
        `}
        gutterSize="none"
      >
        <EuiFlexItem
          grow={false}
          css={css`
            ${showPreview ? 'width: 360px;' : ''}
            border-right: 1px solid ${euiThemeVars.euiColorLightShade};
          `}
        >
          <EuiFlyoutHeader hasBorder aria-labelledby={flyoutHeadingId}>
            <EuiTitle size="xs">
              <h2 id={flyoutHeadingId}>
                {selectedAnnotation ? (
                  <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m">
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="text"
                        iconType="sortLeft"
                        aria-label={i18n.translate('eventAnnotationListing.edit.back', {
                          defaultMessage: 'Back',
                        })}
                        onClick={() => setSelectedAnnotation(undefined)}
                        data-test-subj="backToGroupSettingsTop"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <FormattedMessage
                        id="eventAnnotationListing.groupEditorFlyout.titleWithAnnotation"
                        defaultMessage="Date histogram axis annotation"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <FormattedMessage
                    id="eventAnnotationListing.groupEditorFlyout.title"
                    defaultMessage="Edit annotation group"
                  />
                )}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <GroupEditorControls
              group={group}
              update={updateGroup}
              selectedAnnotation={selectedAnnotation}
              setSelectedAnnotation={setSelectedAnnotation}
              TagSelector={savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector}
              dataViews={dataViews}
              queryInputServices={queryInputServices}
              showValidation={hasAttemptedSave}
              isAdHocDataView={(id) => id === adHocDataView?.id}
            />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              {selectedAnnotation ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    flush="both"
                    iconType="sortLeft"
                    data-test-subj="backToGroupSettings"
                    onClick={() => setSelectedAnnotation(undefined)}
                  >
                    <FormattedMessage id="eventAnnotationListing.edit.back" defaultMessage="Back" />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="cancelGroupEdit"
                      onClick={onClose}
                      size="s"
                      flush="both"
                    >
                      <FormattedMessage
                        id="eventAnnotationListing.edit.cancel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      iconType="save"
                      data-test-subj="saveAnnotationGroup"
                      fill
                      onClick={() => {
                        setHasAttemptedSave(true);

                        if (isGroupValid(group, dataViews)) {
                          onSave();
                        }
                      }}
                    >
                      <FormattedMessage
                        id="eventAnnotationListing.edit.save"
                        defaultMessage="Save annotation group"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlexItem>
        {showPreview && (
          <EuiFlexItem
            css={css`
              background-color: ${euiThemeVars.euiColorLightestShade};
            `}
          >
            <GroupPreview
              group={group}
              dataViews={dataViews}
              LensEmbeddableComponent={LensEmbeddableComponent}
              searchSessionId={searchSessionId}
              refreshSearchSession={refreshSearchSession}
              timePickerQuickRanges={timePickerQuickRanges}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlyout>
  );
};
