/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiColorPicker,
  EuiFormRow,
  useEuiTheme,
  EuiBadge,
  rgbToHex,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { DEVTOOL_IGNORE_ATTR, EDIT_MODAL_ID } from '../../../lib/constants';
import { collectAllTextNodes } from '../../../lib/dom/collect_text_nodes';
import { useOverlayZIndex, usePortalZIndex, useElementSelection } from '../../../hooks';
import { ElementTree } from './element_tree';
import { TextNodeEditor } from './text_node_editor';
import type { TextNodeEntry } from './text_node_editor';
import { createPreviewClone } from '../../../lib/dom/create_preview_clone';

export interface StyleChange {
  element: HTMLElement;
  property: string;
  value: string;
}

export interface TextNodeChange {
  node: Text;
  text?: string;
  color?: string;
}

interface Props {
  target: HTMLElement;
  onClose: () => void;
  onSave: (styleChanges: StyleChange[], textChanges: TextNodeChange[]) => void;
}

export const EditModal = ({ target, onClose, onSave }: Props) => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useOverlayZIndex();
  usePortalZIndex(EDIT_MODAL_ID, zIndex.modal, true);
  const [styleChanges, setStyleChanges] = useState<StyleChange[]>([]);
  const [textChanges, setTextChanges] = useState<Map<Text, TextNodeChange>>(new Map());
  const [cloneRoot, setCloneRoot] = useState<HTMLElement | null>(null);
  const elementMapRef = useRef(new Map<Element, Element>());
  const cloneRef = useRef<HTMLElement | null>(null);
  const textNodeMap = useRef<Array<{ original: Text; clone: Text }>>([]);
  const [textEntries, setTextEntries] = useState<TextNodeEntry[]>([]);

  const { selectedElement, color, setColor, handleSelect } = useElementSelection(elementMapRef);

  const previewCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      if (cloneRef.current) {
        cloneRef.current.remove();
      }

      const { clone, elementMap } = createPreviewClone(target);
      elementMapRef.current = elementMap;
      cloneRef.current = clone;

      // Append clone to DOM first so getComputedStyle works
      node.innerHTML = '';
      node.appendChild(clone);

      // Collect all text nodes from the full tree
      const origTextNodes = collectAllTextNodes(target);
      const cloneTextNodes = collectAllTextNodes(clone);
      const entries: TextNodeEntry[] = [];
      const mapping: Array<{ original: Text; clone: Text }> = [];
      for (let idx = 0; idx < origTextNodes.length; idx++) {
        const orig = origTextNodes[idx];
        const cl = cloneTextNodes[idx];
        if (!cl) continue;
        const parentEl = cl.parentElement;
        entries.push({
          node: orig,
          text: cl.textContent ?? '',
          color: parentEl ? rgbToHex(getComputedStyle(parentEl).color) || '' : '',
        });
        mapping.push({ original: orig, clone: cl });
      }
      textNodeMap.current = mapping;
      setTextEntries(entries);

      setCloneRoot(clone);
    },
    [target]
  );

  const handleColorChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      if (!(selectedElement instanceof HTMLElement)) return;

      const cloneEl = elementMapRef.current.get(selectedElement);
      if (cloneEl instanceof HTMLElement) {
        cloneEl.style.backgroundColor = newColor;
      }

      setStyleChanges((prev) => {
        const filtered = prev.filter(
          (c) => !(c.element === selectedElement && c.property === 'backgroundColor')
        );
        return [
          ...filtered,
          { element: selectedElement as HTMLElement, property: 'backgroundColor', value: newColor },
        ];
      });
    },
    [selectedElement, setColor]
  );

  const handleSave = useCallback(() => {
    onSave(styleChanges, [...textChanges.values()]);
  }, [styleChanges, textChanges, onSave]);

  const handleTextNodeChange = useCallback(
    (index: number, updates: { text?: string; color?: string }) => {
      const entry = textNodeMap.current[index];
      if (!entry) return;

      // Update clone preview
      if (updates.text !== undefined) {
        entry.clone.textContent = updates.text;
      }
      if (updates.color !== undefined) {
        const parent = entry.clone.parentElement;
        if (parent) {
          parent.style.setProperty('color', updates.color, 'important');
          parent.style.setProperty('-webkit-text-fill-color', updates.color, 'important');
        }
      }

      // Update entries state
      setTextEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...updates } : e)));

      // Track changes keyed by original Text node
      setTextChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(entry.original) ?? { node: entry.original };
        if (updates.text !== undefined) existing.text = updates.text;
        if (updates.color !== undefined) existing.color = updates.color;
        next.set(entry.original, existing);
        return next;
      });
    },
    []
  );

  const handleTextNodeFocus = useCallback(
    (index: number) => {
      const entry = textEntries[index];
      if (!entry) return;
      const parentEl = entry.node.parentElement;
      if (parentEl) {
        handleSelect(parentEl);
      }
    },
    [textEntries, handleSelect]
  );

  const previewCss = useMemo(
    () =>
      css({
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: euiTheme.border.radius.small,
        padding: euiTheme.size.m,
        overflow: 'auto',
        background: euiTheme.colors.backgroundBasePlain,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        minHeight: '200px',
        maxHeight: '400px',
      }),
    [euiTheme]
  );

  return (
    <EuiModal
      onClose={onClose}
      maxWidth="900px"
      id={EDIT_MODAL_ID}
      {...{ [DEVTOOL_IGNORE_ATTR]: '' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <h3>
                {i18n.translate('kbnDesignTools.edit.modal.title', {
                  defaultMessage: 'Edit Element',
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
        <EuiFlexGroup gutterSize="m" style={{ minHeight: '300px' }}>
          <EuiFlexItem grow={1}>
            <div ref={previewCallbackRef} className={previewCss} />
          </EuiFlexItem>
          <EuiFlexItem grow={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {cloneRoot && (
              <ElementTree
                root={target}
                selectedElement={selectedElement}
                onSelect={handleSelect}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <TextNodeEditor
          entries={textEntries}
          onChange={handleTextNodeChange}
          onFocus={handleTextNodeFocus}
        />
        {selectedElement && (
          <EuiFormRow
            label={i18n.translate('kbnDesignTools.edit.modal.backgroundColor', {
              defaultMessage: 'Background color',
            })}
            style={{ marginTop: euiTheme.size.m }}
          >
            <EuiColorPicker color={color || '#ffffff'} onChange={handleColorChange} isClearable />
          </EuiFormRow>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('kbnDesignTools.edit.modal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleSave}
          fill
          disabled={styleChanges.length === 0 && textChanges.size === 0}
        >
          {i18n.translate('kbnDesignTools.edit.modal.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
