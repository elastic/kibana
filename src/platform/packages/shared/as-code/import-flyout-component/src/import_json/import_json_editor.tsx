/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState, type DragEvent } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { CodeEditor, XJsonLang } from '@kbn/code-editor';
import { FormattedMessage } from '@kbn/i18n-react';
import { importJsonFlyoutStrings } from './import_json_strings';

const EDITOR_HEIGHT = '400px';

export interface ImportJsonEditorProps {
  dataTestSubjPrefix: string;
  value: string;
  label?: string;
  error?: string | null;
  isValidating?: boolean;
  onTextChange: (text: string) => void;
  onFileChange: (files: FileList | null) => void;
}

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files');

/**
 * JSON input that accepts pasted or typed text, a dropped file, or an uploaded file. A file is
 * loaded into the editor, so the editor content is always what gets validated and imported.
 */
export const ImportJsonEditor = ({
  dataTestSubjPrefix,
  value,
  label = importJsonFlyoutStrings.getEditorLabel(),
  error,
  isValidating,
  onTextChange,
  onFileChange,
}: ImportJsonEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const isEmpty = value.length === 0;

  const getBorderColor = () => {
    if (isDraggingFile) return euiTheme.colors.borderStrongPrimary;
    if (error) return euiTheme.colors.borderStrongDanger;
    return euiTheme.colors.borderBasePlain;
  };

  const inputAreaStyles = css({
    position: 'relative',
    padding: euiTheme.size.s,
    border: `${euiTheme.border.width.thin} ${isEmpty ? 'dashed' : 'solid'} ${getBorderColor()}`,
    borderRadius: euiTheme.border.radius.medium,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  });

  const emptyPromptStyles = css({
    position: 'absolute',
    inset: 0,
    // Rendered before the editor so its upload link comes first in the tab order
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: euiTheme.size.m,
    // Clicks go through to the editor, so the user can paste or type right away
    pointerEvents: 'none',
    // Hidden rather than removed while the editor has focus, so Tab and Shift+Tab can still reach
    // the upload link
    opacity: isEditorFocused ? 0 : 1,
  });

  const iconBadgeStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: euiTheme.size.xxl,
    height: euiTheme.size.xxl,
    borderRadius: '50%',
    backgroundColor: euiTheme.colors.backgroundLightPrimary,
  });

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDraggingFile(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(false);
    onFileChange(event.dataTransfer.files);
  };

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.currentTarget;
    if (files?.length) onFileChange(files);
    // Lets the user upload the same file again
    event.currentTarget.value = '';
  };

  return (
    <EuiForm fullWidth>
      <EuiFormRow
        fullWidth
        // The row holds a drop area rather than a single input, so a `<label for>` would only add a pointer cursor
        labelType="legend"
        label={label}
        labelAppend={
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            // Keeps the row as tall as the Clear button, so the editor doesn't move when it appears
            css={{ minHeight: euiTheme.size.l }}
          >
            {isValidating && (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
            )}
            {!isEmpty && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  flush="right"
                  onClick={() => onTextChange('')}
                  data-test-subj={`${dataTestSubjPrefix}Clear`}
                >
                  {importJsonFlyoutStrings.getClearLabel()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        isInvalid={Boolean(error)}
        error={error ?? undefined}
      >
        <div
          css={inputAreaStyles}
          onDragOverCapture={onDragOver}
          onDragLeave={onDragLeave}
          onDropCapture={onDrop}
          data-test-subj={`${dataTestSubjPrefix}Editor`}
        >
          {isEmpty && (
            <div css={emptyPromptStyles} data-test-subj={`${dataTestSubjPrefix}EmptyPrompt`}>
              <span css={iconBadgeStyles}>
                <EuiIcon type="code" color="primary" aria-hidden={true} />
              </span>
              <EuiText size="s">
                <FormattedMessage
                  id="asCodeImport.importJson.emptyPrompt"
                  defaultMessage="Paste from clipboard or {upload}"
                  values={{
                    upload: (
                      <EuiLink
                        css={{ pointerEvents: isEditorFocused ? 'none' : 'auto' }}
                        onClick={() => fileInputRef.current?.click()}
                        data-test-subj={`${dataTestSubjPrefix}Upload`}
                      >
                        {importJsonFlyoutStrings.getUploadLinkLabel()}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </div>
          )}
          <div
            onFocus={() => setIsEditorFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsEditorFocused(false);
              }
            }}
          >
            <CodeEditor
              languageId={XJsonLang.ID}
              value={value}
              onChange={onTextChange}
              height={EDITOR_HEIGHT}
              fullWidth
              transparentBackground
              aria-label={label}
              options={{
                lineNumbers: 'off',
                fontSize: 12,
                minimap: {
                  enabled: false,
                },
                folding: true,
                glyphMargin: false,
                lineDecorationsWidth: 0,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
              }}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={onFileInputChange}
            data-test-subj={`${dataTestSubjPrefix}FileInput`}
          />
        </div>
      </EuiFormRow>
    </EuiForm>
  );
};
