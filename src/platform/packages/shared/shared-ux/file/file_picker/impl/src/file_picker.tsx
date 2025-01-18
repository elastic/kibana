/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiFlexGroup,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';
import type { DoneNotification } from '@kbn/shared-ux-file-upload';
import { useBehaviorSubject } from '@kbn/shared-ux-file-util';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { useFilePickerContext, FilePickerContext } from './context';

import { Title } from './components/title';
import { ErrorContent } from './components/error_content';
import { EmptyPrompt } from './components/empty_prompt';
import { FileGrid } from './components/file_grid';
import { SearchField } from './components/search_field';
import { ModalFooter } from './components/modal_footer';
import { ClearFilterButton } from './components/clear_filter_button';
import { DeletePrompt } from './components/delete_prompt/delete_prompt';

export interface Props<Kind extends string = string> {
  /**
   * The file kind that was passed to the registry.
   */
  kind: Kind;
  /**
   * A function which determines whether to show a delete button for a file.
   */
  shouldAllowDelete?: (file: FileJSON) => boolean;
  /**
   * Will be called when the modal is closed
   */
  onClose: () => void;
  /**
   * Will be called after a user has a selected a set of files
   */
  onDone: (files: FileJSON[]) => void;
  /**
   * When a user has successfully uploaded some files this callback will be called
   */
  onUpload?: (done: DoneNotification[]) => void;
  /**
   * `meta` value to be used for file uploads
   */
  uploadMeta?: FileJSON['meta'];
  /**
   * The number of results to show per page.
   */
  pageSize?: number;
  /**
   * Whether you can select one or more files
   *
   * @default false
   */
  multiple?: boolean;
}

type InnerProps = Required<Pick<Props, 'onClose' | 'onDone' | 'onUpload' | 'multiple'>>;

const Component: FunctionComponent<InnerProps> = ({ onClose, onDone, onUpload, multiple }) => {
  const { state, kind } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();

  const hasFiles = useBehaviorSubject(state.hasFiles$);
  const hasQuery = useBehaviorSubject(state.hasQuery$);
  const isLoading = useBehaviorSubject(state.isLoading$);
  const error = useBehaviorSubject(state.loadingError$);

  useObservable(state.files$);

  const renderFooter = () => (
    <ModalFooter kind={kind} onDone={onDone} onUpload={onUpload} multiple={multiple} />
  );

  const modal = (
    <EuiModal
      data-test-subj="filePickerModal"
      className="filesFilePicker filesFilePicker--fixed"
      maxWidth="75vw"
      onClose={onClose}
      css={css`
        @media screen and (min-width: ${euiTheme.breakpoint.l}px) {
          width: 75vw;
          height: 75vh;
        }
      `}
    >
      <EuiModalHeader>
        <Title multiple={multiple} />
        <SearchField />
      </EuiModalHeader>
      {isLoading ? (
        <>
          <EuiModalBody>
            <EuiFlexGroup
              css={css`
                height: 100%;
              `}
              justifyContent="center"
              alignItems="center"
              gutterSize="none"
            >
              <EuiLoadingSpinner data-test-subj="loadingSpinner" size="xl" />
            </EuiFlexGroup>
          </EuiModalBody>
          {renderFooter()}
        </>
      ) : Boolean(error) ? (
        <EuiModalBody>
          <ErrorContent error={error as Error} />
        </EuiModalBody>
      ) : !hasFiles && !hasQuery ? (
        <EuiModalBody>
          <EmptyPrompt multiple={multiple} kind={kind} />
        </EuiModalBody>
      ) : (
        <>
          <EuiModalBody>
            <FileGrid />
            <EuiSpacer />
            <ClearFilterButton onClick={() => state.setQuery(undefined)} />
          </EuiModalBody>
          {renderFooter()}
        </>
      )}
    </EuiModal>
  );

  return (
    <>
      {modal}
      <DeletePrompt />
    </>
  );
};

export const FilePicker: FunctionComponent<Props> = ({
  pageSize = 20,
  kind,
  shouldAllowDelete,
  multiple = false,
  uploadMeta,
  onUpload = () => {},
  ...rest
}) => (
  <FilePickerContext
    pageSize={pageSize}
    kind={kind}
    uploadMeta={uploadMeta}
    multiple={multiple}
    shouldAllowDelete={shouldAllowDelete}
  >
    <Component {...rest} {...{ pageSize, kind, multiple, onUpload }} />
  </FilePickerContext>
);

/* eslint-disable import/no-default-export */
export default FilePicker;
