/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { GroupEditorControls, isGroupValid } from './group_editor_controls';

export const GroupEditorFlyout = ({
  group,
  updateGroup,
  onClose: parentOnClose,
  onSave,
  savedObjectsTagging,
  dataViews,
  createDataView,
  queryInputServices,
}: {
  group: EventAnnotationGroupConfig;
  updateGroup: (newGroup: EventAnnotationGroupConfig) => void;
  onClose: () => void;
  onSave: () => void;
  savedObjectsTagging: SavedObjectsTaggingApi;
  dataViews: DataView[];
  createDataView: (spec: DataViewSpec) => Promise<DataView>;
  queryInputServices: QueryInputServices;
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

  return (
    <EuiFlyout onClose={onClose} size={'s'}>
      <EuiFlyoutHeader hasBorder aria-labelledby={flyoutHeadingId}>
        <EuiTitle size="s">
          <h2 id={flyoutHeadingId}>
            <FormattedMessage
              id="eventAnnotationComponents.groupEditorFlyout.title"
              defaultMessage="Edit annotation group"
            />
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
          createDataView={createDataView}
          queryInputServices={queryInputServices}
          showValidation={hasAttemptedSave}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          {selectedAnnotation ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="arrowLeft"
                data-test-subj="backToGroupSettings"
                onClick={() => setSelectedAnnotation(undefined)}
              >
                <FormattedMessage id="eventAnnotationComponents.edit.back" defaultMessage="Back" />
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty data-test-subj="cancelGroupEdit" onClick={onClose}>
                  <FormattedMessage
                    id="eventAnnotationComponents.edit.cancel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="save"
                  data-test-subj="saveAnnotationGroup"
                  fill
                  onClick={() => {
                    setHasAttemptedSave(true);

                    if (isGroupValid(group)) {
                      onSave();
                    }
                  }}
                >
                  <FormattedMessage
                    id="eventAnnotationComponents.edit.save"
                    defaultMessage="Save annotation group"
                  />
                </EuiButton>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
