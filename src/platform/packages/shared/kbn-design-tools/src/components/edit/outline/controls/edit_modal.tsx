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
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import {
  DEVTOOL_IGNORE_ATTR,
  DEVTOOL_HIDDEN_ATTR,
  DEVTOOL_MANAGED_ATTR,
  EDIT_MODAL_ID,
} from '../../../../lib/constants';
import { copyStylesDeep } from '../../../../lib/dom/clone_element';
import { useOverlayZIndex, usePortalZIndex } from '../../../../hooks';
import { ElementTree } from './element_tree';

interface PendingChange {
  element: Element;
  property: string;
  value: string;
}

interface Props {
  target: HTMLElement;
  onClose: () => void;
  onSave: (changes: PendingChange[]) => void;
}

export const EditModal = ({ target, onClose, onSave }: Props) => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useOverlayZIndex();
  usePortalZIndex(EDIT_MODAL_ID, zIndex.modal, true);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [color, setColor] = useState('');
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [cloneRoot, setCloneRoot] = useState<HTMLElement | null>(null);
  const elementMap = useRef(new Map<Element, Element>());
  const cloneRef = useRef<HTMLElement | null>(null);

  const previewCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      if (cloneRef.current) {
        cloneRef.current.remove();
      }

      const clone = target.cloneNode(true) as HTMLElement;
      copyStylesDeep(target, clone);

      clone.style.position = 'relative';
      clone.style.left = '';
      clone.style.top = '';
      clone.style.width = '';
      clone.style.height = '';
      clone.style.margin = '';
      clone.style.zIndex = '';
      clone.style.transform = 'none';
      clone.style.transition = 'none';
      clone.style.pointerEvents = 'none';
      clone.style.maxWidth = '100%';
      clone.style.maxHeight = '100%';
      clone.style.overflow = 'auto';

      // Strip devtool markers and force visibility on the entire clone tree
      clone.removeAttribute(DEVTOOL_HIDDEN_ATTR);
      clone.removeAttribute(DEVTOOL_MANAGED_ATTR);
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      for (const child of clone.querySelectorAll<HTMLElement>('*')) {
        child.removeAttribute(DEVTOOL_HIDDEN_ATTR);
        child.removeAttribute(DEVTOOL_MANAGED_ATTR);
        if (child.style.visibility === 'hidden') child.style.visibility = 'visible';
        if (child.style.opacity === '0') child.style.opacity = '1';
      }

      const map = new Map<Element, Element>();
      const originals = target.querySelectorAll('*');
      const clones = clone.querySelectorAll('*');
      map.set(target, clone);
      for (let i = 0; i < originals.length && i < clones.length; i++) {
        map.set(originals[i], clones[i]);
      }
      elementMap.current = map;
      cloneRef.current = clone;

      node.innerHTML = '';
      node.appendChild(clone);
      setCloneRoot(clone);
    },
    [target]
  );

  const handleSelect = useCallback(
    (element: Element) => {
      // Remove previous highlight
      if (selectedElement) {
        const prevClone = elementMap.current.get(selectedElement);
        if (prevClone instanceof HTMLElement) {
          prevClone.style.outline = '';
        }
      }

      setSelectedElement(element);

      // Highlight in preview
      const cloneEl = elementMap.current.get(element);
      if (cloneEl instanceof HTMLElement) {
        cloneEl.style.outline = `2px solid ${euiTheme.colors.primary}`;
      }

      // Show current background color
      if (element instanceof HTMLElement) {
        const cloneCounterpart = elementMap.current.get(element);
        const bg =
          cloneCounterpart instanceof HTMLElement
            ? cloneCounterpart.style.backgroundColor
            : element.style.backgroundColor;
        setColor(bg || '');
      }
    },
    [selectedElement, euiTheme.colors.primary]
  );

  const handleColorChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      if (!selectedElement) return;

      const cloneEl = elementMap.current.get(selectedElement);
      if (cloneEl instanceof HTMLElement) {
        cloneEl.style.backgroundColor = newColor;
      }

      setChanges((prev) => {
        const filtered = prev.filter(
          (c) => !(c.element === selectedElement && c.property === 'backgroundColor')
        );
        return [
          ...filtered,
          { element: selectedElement, property: 'backgroundColor', value: newColor },
        ];
      });
    },
    [selectedElement]
  );

  const handleSave = useCallback(() => {
    onSave(changes);
  }, [changes, onSave]);

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
                {i18n.translate('kbnDesignTools.editModal.title', {
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

        {selectedElement && (
          <EuiFormRow
            label={i18n.translate('kbnDesignTools.editModal.backgroundColor', {
              defaultMessage: 'Background color',
            })}
            style={{ marginTop: euiTheme.size.m }}
          >
            <EuiColorPicker color={color} onChange={handleColorChange} />
          </EuiFormRow>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('kbnDesignTools.editModal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={handleSave} fill disabled={changes.length === 0}>
          {i18n.translate('kbnDesignTools.editModal.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
