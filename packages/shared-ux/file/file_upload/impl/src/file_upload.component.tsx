/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFilePicker,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  EuiFilePickerClass,
  EuiFilePickerProps,
} from '@elastic/eui/src/components/form/file_picker/file_picker';
import { euiThemeVars } from '@kbn/ui-theme';
import { useBehaviorSubject } from '@kbn/shared-ux-file-util';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { i18nTexts } from './i18n_texts';
import { ControlButton, ClearButton } from './components';
import { useUploadState } from './context';

export interface Props {
  meta?: unknown;
  accept?: string;
  multiple?: boolean;
  fullWidth?: boolean;
  immediate?: boolean;
  allowClear?: boolean;
  compressed?: boolean;
  initialFilePromptText?: string;
  className?: string;
}

const { euiFormMaxWidth, euiButtonHeightSmall } = euiThemeVars;

const styles = {
  horizontalContainer: css`
    display: flex;
    flex-direction: row;
  `,
  fullWidth: css`
    width: 100%;
  `,
};

export const FileUpload = React.forwardRef<EuiFilePickerClass, Props>(
  (
    {
      compressed,
      meta,
      accept,
      immediate,
      allowClear = false,
      multiple,
      initialFilePromptText,
      fullWidth,
      className,
    },
    ref
  ) => {
    const { euiTheme } = useEuiTheme();
    const uploadState = useUploadState();
    const uploading = useBehaviorSubject(uploadState.uploading$);
    const error = useBehaviorSubject(uploadState.error$);
    const done = useObservable(uploadState.done$);
    const isInvalid = Boolean(error);
    const errorMessage = error?.message;

    const id = useGeneratedHtmlId({ prefix: 'filesFileUpload' });
    const errorId = `${id}_error`;

    return (
      <div
        data-test-subj="filesFileUpload"
        css={[
          css`
            max-width: ${fullWidth ? '100%' : euiFormMaxWidth};
          `,
          fullWidth ? styles.fullWidth : undefined,
          compressed ? styles.horizontalContainer : undefined,
        ]}
        className={className}
      >
        <EuiFilePicker
          fullWidth={fullWidth}
          aria-label={i18nTexts.defaultPickerLabel}
          id={id}
          ref={ref as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
          onChange={(fs) => {
            uploadState.setFiles(Array.from(fs ?? []));
            if (immediate && uploadState.hasFiles()) uploadState.upload(meta);
          }}
          multiple={multiple}
          initialPromptText={initialFilePromptText}
          isLoading={uploading}
          isInvalid={isInvalid}
          accept={accept}
          disabled={Boolean(done?.length || uploading)}
          aria-describedby={errorMessage ? errorId : undefined}
          display={compressed ? 'default' : 'large'}
        />

        <EuiSpacer
          size="s"
          css={
            compressed
              ? css`
                  width: ${euiTheme.size.s};
                `
              : undefined
          }
        />

        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems={compressed ? 'center' : 'flexStart'}
          direction={compressed ? undefined : 'rowReverse'}
          gutterSize={compressed ? 'none' : 'm'}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <ControlButton
              compressed={compressed}
              immediate={immediate}
              onCancel={uploadState.abort}
              onUpload={() => uploadState.upload(meta)}
            />
          </EuiFlexItem>
          {!compressed && Boolean(!done && !uploading && errorMessage) && (
            <EuiFlexItem>
              <EuiText
                data-test-subj="error"
                css={css`
                  display: flex;
                  align-items: center;
                  min-height: ${euiButtonHeightSmall};
                `}
                size="s"
                color="danger"
              >
                <span id={errorId}>{errorMessage}</span>
              </EuiText>
            </EuiFlexItem>
          )}
          {!compressed && done?.length && allowClear && (
            <>
              <EuiFlexItem /> {/* Occupy middle space */}
              <EuiFlexItem grow={false}>
                <ClearButton onClick={uploadState.clear} />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </div>
    );
  }
);
