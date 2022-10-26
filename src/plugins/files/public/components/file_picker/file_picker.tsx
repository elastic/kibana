/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from '@elastic/eui';

import { useBehaviorSubject } from '../use_behavior_subject';
import { useFilePickerContext, FilePickerContext } from './context';

import { Title } from './components/title';
import { ErrorContent } from './components/error_content';
import { UploadFilesPrompt } from './components/upload_files';
import { FileGrid } from './components/file_grid';
import { SearchField } from './components/search_field';
import { ModalFooter } from './components/modal_footer';

import './file_picker.scss';
import { ClearFilterButton } from './components/clear_filter_button';

export interface Props<Kind extends string = string> {
  /**
   * The file kind that was passed to the registry.
   */
  kind: Kind;
  /**
   * Will be called when the modal is closed
   */
  onClose: () => void;
  /**
   * Will be called after a user has a selected a set of files
   */
  onDone: (fileIds: string[]) => void;
  /**
   * The number of results to show per page.
   */
  pageSize?: number;
}

const Component: FunctionComponent<Props> = ({ onClose, onDone }) => {
  const { state, kind } = useFilePickerContext();

  const hasFiles = useBehaviorSubject(state.hasFiles$);
  const hasQuery = useBehaviorSubject(state.hasQuery$);
  const isLoading = useBehaviorSubject(state.isLoading$);
  const error = useBehaviorSubject(state.loadingError$);

  useObservable(state.files$);

  const renderFooter = () => <ModalFooter onDone={onDone} />;

  return (
    <EuiModal
      data-test-subj="filePickerModal"
      className="filesFilePicker filesFilePicker--fixed"
      maxWidth="75vw"
      onClose={onClose}
    >
      <EuiModalHeader>
        <Title />
        <SearchField />
      </EuiModalHeader>
      {isLoading ? (
        <>
          <EuiModalBody>
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="none">
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
          <UploadFilesPrompt kind={kind} />
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
};

export const FilePicker: FunctionComponent<Props> = (props) => (
  <FilePickerContext pageSize={props.pageSize ?? 20} kind={props.kind}>
    <Component {...props} />
  </FilePickerContext>
);

/* eslint-disable import/no-default-export */
export default FilePicker;
