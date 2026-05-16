/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { DEVTOOL_IGNORE_ATTR, EDIT_MODAL_ID } from '../../../lib/constants';
import { useOverlayZIndex } from '../../../hooks/use_overlay_z_index';
import { usePortalZIndex } from '../../../hooks/use_portal_z_index';
import { usePreviewClone } from '../../../hooks/use_preview_clone';
import { useDraftHistory } from '../../../hooks/use_draft_history';
import { useModalChangeHandlers } from '../../../hooks/use_modal_change_handlers';
import { useModalKeyboard } from '../../../hooks/use_modal_keyboard';
import type { StyleChange, TextNodeChange, MediaChange } from '../../../lib/dom/element_registry';
import { EditModalPreview } from './edit_modal_preview';
import { EditModalEditorColumns } from './edit_modal_editor_columns';
import { EditModalFooterBar } from './edit_modal_footer';
import { roundPxValue } from '../../../lib/dom/round_px_value';
import type { DimensionEntry } from './dimensions_editor';

export type { StyleChange, TextNodeChange, MediaChange as MediaChange };

const modalCss = css({
  width: '90vw',
  maxWidth: 1200,
  minHeight: 800,
});

type DimensionProperty = 'width' | 'height' | 'padding' | 'margin' | 'border-radius';

const DIMENSION_PROPS: Array<{ property: DimensionProperty; label: string }> = [
  {
    property: 'width',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.width', {
      defaultMessage: 'Width',
    }),
  },
  {
    property: 'height',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.height', {
      defaultMessage: 'Height',
    }),
  },
  {
    property: 'padding',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.padding', {
      defaultMessage: 'Padding',
    }),
  },
  {
    property: 'margin',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.margin', {
      defaultMessage: 'Margin',
    }),
  },
  {
    property: 'border-radius',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.borderRadius', {
      defaultMessage: 'Border radius',
    }),
  },
];

interface Props {
  target: HTMLElement;
  onClose: () => void;
  onSave: (
    styleChanges: StyleChange[],
    textChanges: TextNodeChange[],
    mediaChanges: MediaChange[]
  ) => void;
}

const useDimensionEntries = (
  selectedElement: Element | null,
  elementMapRef: React.MutableRefObject<Map<Element, Element>>,
  originalDimensionsRef: React.MutableRefObject<Map<Element, Map<string, string>>>
): DimensionEntry[] => {
  if (!selectedElement || !(selectedElement instanceof HTMLElement)) return [];
  const cloneEl = elementMapRef.current.get(selectedElement);
  const el = cloneEl instanceof HTMLElement ? cloneEl : selectedElement;
  const computed = window.getComputedStyle(el);
  const origDims = originalDimensionsRef.current.get(selectedElement);
  return DIMENSION_PROPS.map(({ property, label }) => ({
    property,
    label,
    value: roundPxValue(computed.getPropertyValue(property)),
    originalValue: roundPxValue(origDims?.get(property) ?? computed.getPropertyValue(property)),
  }));
};

export const EditModal = ({ target, onClose, onSave }: Props) => {
  const zIndex = useOverlayZIndex();
  usePortalZIndex(EDIT_MODAL_ID, zIndex.modal, true);

  const draft = useDraftHistory();

  const {
    cloneRoot,
    cloneRef,
    elementMapRef,
    textNodeMap,
    mediaMap,
    textEntries,
    setTextEntries,
    mediaEntries,
    setMediaEntries: setMediaEntries,
    selectedElement,
    color,
    setColor,
    handleSelect,
    previewCallbackRef,
  } = usePreviewClone(target);

  const {
    handleColorChange,
    handleDimensionChange,
    handleDimensionFocus,
    handleTextNodeChange,
    handleTextNodeFocus,
    handleMediaChange,
    handleMediaFocus,
    handleSave,
    handleDraftUndo,
    handleDraftRedo,
    originalDimensionsRef,
  } = useModalChangeHandlers({
    selectedElement,
    color,
    setColor,
    handleSelect,
    draft,
    elementMapRef,
    textNodeMap,
    mediaMap,
    cloneRef,
    textEntries,
    setTextEntries,
    mediaEntries,
    setMediaEntries,
    dimensionProps: DIMENSION_PROPS,
    onSave,
  });

  useModalKeyboard(handleDraftUndo, handleDraftRedo);

  const dimensionEntries = useDimensionEntries(
    selectedElement,
    elementMapRef,
    originalDimensionsRef
  );

  return (
    <EuiModal
      onClose={onClose}
      maxWidth="90vw"
      css={modalCss}
      id={EDIT_MODAL_ID}
      {...{ [DEVTOOL_IGNORE_ATTR]: '' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <h3 data-test-subj="editModalTitle">
                {i18n.translate('kbnDesignTools.edit.modal.title', {
                  defaultMessage: 'Edit element',
                })}
              </h3>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="beta" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EditModalPreview
          target={target}
          cloneRoot={cloneRoot}
          selectedElement={selectedElement}
          onSelect={handleSelect}
          previewCallbackRef={previewCallbackRef}
        />
        <EditModalEditorColumns
          selectedElement={selectedElement}
          color={color}
          textEntries={textEntries}
          mediaEntries={mediaEntries}
          dimensionEntries={dimensionEntries}
          onColorChange={handleColorChange}
          onTextNodeChange={handleTextNodeChange}
          onTextNodeFocus={handleTextNodeFocus}
          onMediaChange={handleMediaChange}
          onMediaFocus={handleMediaFocus}
          onDimensionChange={handleDimensionChange}
          onDimensionFocus={handleDimensionFocus}
        />
      </EuiModalBody>
      <EditModalFooterBar
        draftState={draft.state}
        onUndo={handleDraftUndo}
        onRedo={handleDraftRedo}
        onCancel={onClose}
        onSave={handleSave}
      />
    </EuiModal>
  );
};
