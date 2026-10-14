/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TextNodeEditor } from './text_node_editor';
import type { TextNodeEntry } from './text_node_editor';
import { MediaEditor } from './media_editor';
import type { MediaEditorEntry } from './media_editor';
import { HtmlAttributesEditor } from './html_attributes_editor';
import { DimensionsEditor } from './dimensions_editor';

const columnCss = css({ flex: '1 1 0', minWidth: 250 });

interface DimensionEntry {
  property: string;
  label: string;
  value: string;
  originalValue: string;
}

interface Props {
  selectedElement: Element | null;
  color: string;
  textEntries: TextNodeEntry[];
  mediaEntries: MediaEditorEntry[];
  dimensionEntries: DimensionEntry[];
  onColorChange: (color: string) => void;
  onTextNodeChange: (
    index: number,
    updates: { text?: string; color?: string; fontSize?: string; fontWeight?: string }
  ) => void;
  onTextNodeFocus: (index: number) => void;
  onMediaChange: (index: number, value: string) => void;
  onMediaFocus: (index: number) => void;
  onDimensionChange: (property: string, value: string) => void;
  onDimensionFocus: () => void;
}

export const EditModalEditorColumns = ({
  selectedElement,
  color,
  textEntries,
  mediaEntries,
  dimensionEntries,
  onColorChange,
  onTextNodeChange,
  onTextNodeFocus,
  onMediaChange,
  onMediaFocus,
  onDimensionChange,
  onDimensionFocus,
}: Props) => {
  const hasTextEntries = textEntries.length > 0;
  const hasMediaEntries = mediaEntries.length > 0;
  const hasEditorContent = hasTextEntries || hasMediaEntries || !!selectedElement;

  if (!hasEditorContent) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l">
        {hasTextEntries && (
          <EuiFlexItem css={columnCss}>
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
              onChange={onTextNodeChange}
              onFocus={onTextNodeFocus}
            />
          </EuiFlexItem>
        )}
        {hasMediaEntries && (
          <EuiFlexItem css={columnCss}>
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('kbnDesignTools.edit.modal.mediaColumnTitle', {
                  defaultMessage: 'Media',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <MediaEditor entries={mediaEntries} onChange={onMediaChange} onFocus={onMediaFocus} />
          </EuiFlexItem>
        )}
        {selectedElement && (
          <EuiFlexItem css={columnCss}>
            <EuiTitle size="xxs">
              <h4 data-test-subj="editModalAttributesTitle">
                {i18n.translate('kbnDesignTools.edit.modal.attributesColumnTitle', {
                  defaultMessage: 'Attributes',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <HtmlAttributesEditor color={color || '#FFFFFF'} onChange={onColorChange} />
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
              onChange={onDimensionChange}
              onFocus={onDimensionFocus}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
