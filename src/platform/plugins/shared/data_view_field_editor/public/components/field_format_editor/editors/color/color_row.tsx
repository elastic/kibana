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
  EuiButton,
  EuiButtonIcon,
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Color {
  range?: string;
  regex?: string;
  boolean?: string;
  text: string;
  background: string;
}

interface ColorRowProps {
  color: Color;
  index: number;
  fieldType: string;
  showDeleteButton: boolean;
  onColorChange: (newColorParams: Partial<Color>, index: number) => void;
  onRemoveColor: (index: number) => void;
}

export const ColorRow = ({
  color,
  index,
  fieldType,
  showDeleteButton,
  onColorChange,
  onRemoveColor,
}: ColorRowProps) => {
  const { range, regex, boolean, text, background } = color;

  const getInputByFieldType = () => {
    if (fieldType === 'boolean')
      return (
        <EuiSelect
          prepend={i18n.translate('indexPatternFieldEditor.color.booleanLabel', {
            defaultMessage: 'Boolean',
          })}
          options={[
            { value: 'true', text: 'true' },
            { value: 'false', text: 'false' },
          ]}
          value={boolean}
          data-test-subj={`colorEditorKeyBoolean ${index}`}
          onChange={(e) => {
            onColorChange(
              {
                boolean: e.target.value,
              },
              index
            );
          }}
        />
      );
    if (fieldType === 'string')
      return (
        <EuiFieldText
          prepend={i18n.translate('indexPatternFieldEditor.color.patternLabel', {
            defaultMessage: 'Pattern',
          })}
          value={regex}
          data-test-subj={`colorEditorKeyPattern ${index}`}
          onChange={(e) => {
            onColorChange(
              {
                regex: e.target.value,
              },
              index
            );
          }}
        />
      );
    return (
      <EuiFieldText
        prepend={i18n.translate('indexPatternFieldEditor.color.rangeLabel', {
          defaultMessage: 'Range',
        })}
        value={range}
        data-test-subj={`colorEditorKeyRange ${index}`}
        onChange={(e) => {
          onColorChange(
            {
              range: e.target.value,
            },
            index
          );
        }}
      />
    );
  };

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem>{getInputByFieldType()}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiColorPicker
          color={text}
          data-test-subj={`colorEditorColorPicker ${index}`}
          onChange={(newColor) => {
            onColorChange(
              {
                text: newColor,
              },
              index
            );
          }}
          button={
            <EuiButton
              minWidth="false"
              iconType="lettering"
              color="text"
              onClick={() => {}}
              aria-label={i18n.translate('indexPatternFieldEditor.color.letteringButtonAriaLabel', {
                defaultMessage: 'Select a text color for item {index}',
                values: {
                  index,
                },
              })}
            >
              <EuiIcon
                aria-label={text}
                color={text}
                size="l"
                type="stopFilled"
                data-test-subj="buttonColorSwatchIcon"
              />
            </EuiButton>
          }
          secondaryInputDisplay="bottom"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiColorPicker
          color={background}
          data-test-subj={`colorEditorBackgroundPicker ${index}`}
          onChange={(newColor: string) => {
            onColorChange(
              {
                background: newColor,
              },
              index
            );
          }}
          button={
            <EuiButton
              minWidth="false"
              iconType="color"
              color="text"
              onClick={() => {}}
              aria-label={i18n.translate('indexPatternFieldEditor.color.letteringButtonAriaLabel', {
                defaultMessage: 'Select a background color for item {index}',
                values: {
                  index,
                },
              })}
            >
              <EuiIcon
                aria-label={background}
                color={background}
                size="l"
                type="stopFilled"
                data-test-subj="buttonColorSwatchIcon"
              />
            </EuiButton>
          }
          secondaryInputDisplay="bottom"
        />
      </EuiFlexItem>
      {showDeleteButton && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            onClick={() => {
              onRemoveColor(index);
            }}
            aria-label={i18n.translate('indexPatternFieldEditor.color.deleteTitle', {
              defaultMessage: 'Delete color format',
            })}
            data-test-subj="colorEditorRemoveColor"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
