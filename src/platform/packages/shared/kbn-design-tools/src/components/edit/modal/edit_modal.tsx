/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  EuiBadge,
  rgbToHex,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { DEVTOOL_IGNORE_ATTR, EDIT_MODAL_ID } from '../../../lib/constants';
import { collectAllTextNodes } from '../../../lib/dom/collect_text_nodes';
import { collectSourceElements } from '../../../lib/dom/collect_source_elements';
import { setImportant } from '../../../lib/dom/clone_element';
import { useOverlayZIndex, usePortalZIndex, useElementSelection } from '../../../hooks';
import { getPageColorMode } from '../../../lib/dom';
import { getContentRoot } from '../../../lib/dom/managed_element';
import { replaceIconContent } from '../../../lib/eui_icon_cache';
import { ElementTree } from './element_tree';
import { TextNodeEditor } from './text_node_editor';
import type { TextNodeEntry } from './text_node_editor';
import { SourceEditor } from './source_editor';
import type { SourceEditorEntry } from './source_editor';
import { HtmlAttributesEditor } from './html_attributes_editor';
import { DimensionsEditor } from './dimensions_editor';
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
  fontSize?: string;
  fontWeight?: string;
}

export interface SourceChange {
  element: Element;
  attribute: string;
  value: string;
}

interface Props {
  target: HTMLElement;
  onClose: () => void;
  onSave: (
    styleChanges: StyleChange[],
    textChanges: TextNodeChange[],
    sourceChanges: SourceChange[]
  ) => void;
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
  const mountedRef = useRef(true);
  const textNodeMap = useRef<Array<{ original: Text; clone: Text }>>([]);
  const [textEntries, setTextEntries] = useState<TextNodeEntry[]>([]);
  const sourceMap = useRef<Array<{ original: Element; clone: Element; attribute: string }>>([]);
  const [sourceEntries, setSourceEntries] = useState<SourceEditorEntry[]>([]);
  const [sourceChanges, setSourceChanges] = useState<Map<Element, SourceChange>>(new Map());

  const { selectedElement, color, setColor, handleSelect } = useElementSelection(elementMapRef);

  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  // Clean up clone ref and mark unmounted so async callbacks can bail out.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cloneRef.current = null;
    };
  }, []);

  // Collect source elements asynchronously once the clone is mounted.
  // Runs inside a useEffect so React's scheduler properly tracks the
  // state update and act() can flush it during tests.
  useEffect(() => {
    if (!cloneRoot) return;
    let cancelled = false;
    const collectSources = async () => {
      const origSources = await collectSourceElements(target);
      const cloneSources = await collectSourceElements(cloneRoot);
      if (cancelled || !mountedRef.current) return;
      const srcEntries: SourceEditorEntry[] = [];
      const srcMapping: Array<{ original: Element; clone: Element; attribute: string }> = [];
      for (let idx = 0; idx < origSources.length; idx++) {
        const orig = origSources[idx];
        const cl = cloneSources[idx];
        if (!cl) continue;
        srcEntries.push({
          element: orig.element,
          attribute: orig.attribute,
          value: orig.value,
          originalValue: orig.value,
          label: orig.label,
        });
        srcMapping.push({ original: orig.element, clone: cl.element, attribute: orig.attribute });
      }
      sourceMap.current = srcMapping;
      setSourceEntries(srcEntries);
    };
    collectSources();
    return () => {
      cancelled = true;
    };
  }, [cloneRoot, target]);

  /**
   * Re-select the current element to refresh the preview overlay.
   * Used after dimension/font changes that alter the element's size.
   */
  const refreshOverlay = useCallback(() => {
    if (selectedElement) {
      // Defer to next frame so the DOM has updated from the style change.
      requestAnimationFrame(() => {
        handleSelectRef.current(selectedElement);
      });
    }
  }, [selectedElement]);

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
        const parentStyles = parentEl ? getComputedStyle(parentEl) : null;
        entries.push({
          node: orig,
          text: cl.textContent ?? '',
          color: parentStyles ? rgbToHex(parentStyles.color) || '' : '',
          fontSize: parentStyles ? parentStyles.fontSize : '',
          fontWeight: parentStyles ? parentStyles.fontWeight : '',
        });
        mapping.push({ original: orig, clone: cl });
      }
      textNodeMap.current = mapping;
      setTextEntries(entries);

      // Collect source elements (img, video, svg image/use, etc.)
      // Deferred to a useEffect (triggered by setCloneRoot below) so the
      // async state update is properly tracked by React's scheduler and
      // does not fire outside act() in tests.

      setCloneRoot(clone);

      // Select the outermost element by default now that the preview is ready.
      // Called here instead of in a separate useEffect to avoid an extra render
      // cycle and to guarantee elementMapRef is populated.
      // For live elements the tree root is the first child (skipping the wrapper).
      const initialSelection = getContentRoot(target);
      handleSelectRef.current(initialSelection);
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

  const handleDimensionChange = useCallback(
    (property: string, value: string) => {
      if (!(selectedElement instanceof HTMLElement)) return;

      const cloneEl = elementMapRef.current.get(selectedElement);
      if (cloneEl instanceof HTMLElement) {
        setImportant(cloneEl, property, value);
      }

      setStyleChanges((prev) => {
        const filtered = prev.filter(
          (c) => !(c.element === selectedElement && c.property === property)
        );
        return [
          ...filtered,
          { element: selectedElement as HTMLElement, property, value },
        ];
      });

      refreshOverlay();
    },
    [selectedElement, refreshOverlay]
  );

  const handleDimensionFocus = useCallback(() => {
    if (selectedElement) {
      handleSelect(selectedElement);
    }
  }, [selectedElement, handleSelect]);

  const handleSave = useCallback(() => {
    onSave(styleChanges, [...textChanges.values()], [...sourceChanges.values()]);
  }, [styleChanges, textChanges, sourceChanges, onSave]);

  const handleTextNodeChange = useCallback(
    (
      index: number,
      updates: { text?: string; color?: string; fontSize?: string; fontWeight?: string }
    ) => {
      const entry = textNodeMap.current[index];
      if (!entry) return;

      // Update clone preview
      if (updates.text !== undefined) {
        entry.clone.textContent = updates.text;
      }
      const parent = entry.clone.parentElement;
      if (parent) {
        if (updates.color !== undefined) {
          setImportant(parent, 'color', updates.color);
          setImportant(parent, '-webkit-text-fill-color', updates.color);
        }
        if (updates.fontSize !== undefined) {
          setImportant(parent, 'font-size', updates.fontSize);
        }
        if (updates.fontWeight !== undefined) {
          setImportant(parent, 'font-weight', updates.fontWeight);
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
        if (updates.fontSize !== undefined) existing.fontSize = updates.fontSize;
        if (updates.fontWeight !== undefined) existing.fontWeight = updates.fontWeight;
        next.set(entry.original, existing);
        return next;
      });

      // Re-select the current element to refresh the preview outline
      // since font changes can alter the element's dimensions.
      refreshOverlay();
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

  const handleSourceChange = useCallback((index: number, value: string) => {
    const entry = sourceMap.current[index];
    if (!entry) return;

    // Update clone preview
    if (entry.attribute === 'data-icon-type') {
      replaceIconContent(entry.clone, value);
    } else {
      entry.clone.setAttribute(entry.attribute, value);
    }

    // Update entries state
    setSourceEntries((prev) => prev.map((e, i) => (i === index ? { ...e, value } : e)));

    // Track changes keyed by original element
    setSourceChanges((prev) => {
      const next = new Map(prev);
      next.set(entry.original, {
        element: entry.original,
        attribute: entry.attribute,
        value,
      });
      return next;
    });
  }, []);

  const handleSourceFocus = useCallback(
    (index: number) => {
      const entry = sourceEntries[index];
      if (!entry) return;
      handleSelect(entry.element);
    },
    [sourceEntries, handleSelect]
  );

  const pageColorMode = getPageColorMode();

  const previewCss = useMemo(
    () =>
      css({
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: euiTheme.border.radius.small,
        padding: euiTheme.size.m,
        overflow: 'auto',
        background: pageColorMode === 'dark' ? '#0B1628' : '#FFFFFF',
        height: 400,
      }),
    [euiTheme, pageColorMode]
  );

  const treeCss = useMemo(
    () =>
      css({
        overflow: 'auto',
        height: 400,
      }),
    []
  );

  const modalCss = useMemo(
    () =>
      css({
        width: '90vw',
        maxWidth: 1200,
        minHeight: 800,
      }),
    []
  );

  const rowCss = useMemo(() => css({ minHeight: 400 }), []);
  const previewItemCss = useMemo(() => css({ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }), []);
  const treeItemCss = useMemo(() => css({ flex: '0 0 300px', minWidth: 200 }), []);
  const columnCss = useMemo(() => css({ flex: '1 1 0', minWidth: 250 }), []);

  const DIMENSION_PROPS: Array<{ property: string; label: string }> = useMemo(
    () => [
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
    ],
    []
  );

  const dimensionEntries = useMemo(() => {
    if (!selectedElement || !(selectedElement instanceof HTMLElement)) return [];
    const cloneEl = elementMapRef.current.get(selectedElement);
    const el = cloneEl instanceof HTMLElement ? cloneEl : selectedElement;
    const computed = window.getComputedStyle(el);
    return DIMENSION_PROPS.map(({ property, label }) => ({
      property,
      label,
      value: computed.getPropertyValue(property),
    }));
  }, [selectedElement, DIMENSION_PROPS, styleChanges]);

  return (
    <EuiModal
      onClose={onClose}
      maxWidth="90vw"
      className={modalCss}
      id={EDIT_MODAL_ID}
      {...{ [DEVTOOL_IGNORE_ATTR]: '' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <h3>
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
        <EuiFlexGroup gutterSize="m" className={rowCss}>
          <EuiFlexItem className={previewItemCss}>
            <div
              ref={previewCallbackRef}
              className={previewCss}
              onWheel={(e) => e.stopPropagation()}
            />
          </EuiFlexItem>
          <EuiFlexItem className={treeItemCss}>
            {cloneRoot && (
              <div className={treeCss}>
                <ElementTree
                  root={getContentRoot(target)}
                  selectedElement={selectedElement}
                  onSelect={handleSelect}
                />
              </div>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        {(textEntries.length > 0 || sourceEntries.length > 0 || selectedElement) && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="l">
              {textEntries.length > 0 && (
                <EuiFlexItem className={columnCss}>
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate('kbnDesignTools.edit.modal.textColumnTitle', {
                        defaultMessage: 'Text',
                      })}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <TextNodeEditor
                    entries={textEntries}
                    onChange={handleTextNodeChange}
                    onFocus={handleTextNodeFocus}
                  />
                </EuiFlexItem>
              )}
              {sourceEntries.length > 0 && (
                <EuiFlexItem className={columnCss}>
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate('kbnDesignTools.edit.modal.sourceColumnTitle', {
                        defaultMessage: 'Sources',
                      })}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <SourceEditor
                    entries={sourceEntries}
                    onChange={handleSourceChange}
                    onFocus={handleSourceFocus}
                  />
                </EuiFlexItem>
              )}
              {selectedElement && (
                <EuiFlexItem className={columnCss}>
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate('kbnDesignTools.edit.modal.attributesColumnTitle', {
                        defaultMessage: 'Attributes',
                      })}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <HtmlAttributesEditor color={color || '#FFFFFF'} onChange={handleColorChange} />
                  <EuiSpacer size="m" />
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate('kbnDesignTools.edit.modal.dimensionsColumnTitle', {
                        defaultMessage: 'Dimensions',
                      })}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <DimensionsEditor
                    entries={dimensionEntries}
                    onChange={handleDimensionChange}
                    onFocus={handleDimensionFocus}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
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
          disabled={styleChanges.length === 0 && textChanges.size === 0 && sourceChanges.size === 0}
        >
          {i18n.translate('kbnDesignTools.edit.modal.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
