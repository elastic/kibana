/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment, ReactNode } from 'react';
import { take } from 'lodash';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiFilePicker,
  EuiInMemoryTable,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiCallOut,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { HttpStart, IBasePath } from '@kbn/core/public';
import { ISearchStart } from '@kbn/data-plugin/public';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import {
  importFile,
  resolveImportErrors,
  processImportResponse,
  ProcessedImportResponse,
} from '../../../lib';
import { FailedImportConflict, RetryDecision } from '../../../lib/resolve_import_errors';
import { OverwriteModal } from './overwrite_modal';
import { ImportModeControl, ImportMode } from './import_mode_control';
import { ImportSummary } from './import_summary';

const CREATE_NEW_COPIES_DEFAULT = false;
const OVERWRITE_ALL_DEFAULT = true;

export interface FlyoutProps {
  close: () => void;
  done: () => void;
  newIndexPatternUrl: string;
  dataViews: DataViewsContract;
  http: HttpStart;
  basePath: IBasePath;
  search: ISearchStart;
  allowedTypes: SavedObjectManagementTypeInfo[];
}

export interface FlyoutState {
  unmatchedReferences?: ProcessedImportResponse['unmatchedReferences'];
  unmatchedReferencesTablePagination: { pageIndex: number; pageSize: number };
  failedImports?: ProcessedImportResponse['failedImports'];
  successfulImports?: ProcessedImportResponse['successfulImports'];
  conflictingRecord?: ConflictingRecord;
  importWarnings?: ProcessedImportResponse['importWarnings'];
  error?: string;
  file?: File;
  importCount: number;
  indexPatterns?: DataView[];
  importMode: ImportMode;
  loadingMessage?: string;
  status: string;
}

interface ConflictingRecord {
  conflict: FailedImportConflict;
  done: (result: [boolean, string | undefined]) => void;
}

const getErrorMessage = (e: any) => {
  const errorMessage =
    e.body?.error && e.body?.message ? `${e.body.error}: ${e.body.message}` : e.message;
  return i18n.translate('savedObjectsManagement.objectsTable.flyout.importFileErrorMessage', {
    defaultMessage: 'The file could not be processed due to error: "{error}"',
    values: {
      error: errorMessage,
    },
  });
};

export class Flyout extends Component<FlyoutProps, FlyoutState> {
  constructor(props: FlyoutProps) {
    super(props);

    this.state = {
      unmatchedReferences: undefined,
      unmatchedReferencesTablePagination: {
        pageIndex: 0,
        pageSize: 5,
      },
      conflictingRecord: undefined,
      error: undefined,
      file: undefined,
      importCount: 0,
      indexPatterns: undefined,
      importMode: { createNewCopies: CREATE_NEW_COPIES_DEFAULT, overwrite: OVERWRITE_ALL_DEFAULT },
      loadingMessage: undefined,
      status: 'idle',
    };
  }

  componentDidMount() {
    this.fetchIndexPatterns();
  }

  fetchIndexPatterns = async () => {
    const indexPatterns = (await this.props.dataViews.getCache())?.map((savedObject) => ({
      id: savedObject.id,
      title: savedObject.attributes.title,
    }));
    this.setState({ indexPatterns } as any);
  };

  changeImportMode = (importMode: FlyoutState['importMode']) => {
    this.setState(() => ({ importMode }));
  };

  setImportFile = (files: FileList | null) => {
    if (!files || !files[0]) {
      this.setState({ file: undefined });
      return;
    }
    const file = files[0];
    this.setState({ file });
  };

  /**
   * Import
   *
   * Does the initial import of a file, resolveImportErrors then handles errors and retries
   */
  import = async () => {
    const { http } = this.props;
    const { file, importMode } = this.state;
    if (file === undefined) {
      this.setState({
        status: 'error',
        error: 'missing_file',
      });
      return;
    }
    this.setState({ status: 'loading', error: undefined });

    // Import the file
    try {
      const response = await importFile(http, file, importMode);
      this.setState(processImportResponse(response), () => {
        // Resolve import errors right away if there's no index patterns to match
        // This will ask about overwriting each object, etc
        if (this.state.unmatchedReferences?.length === 0) {
          this.resolveImportErrors();
        }
      });
    } catch (e) {
      this.setState({
        status: 'error',
        error: getErrorMessage(e),
      });
      return;
    }
  };

  /**
   * Get Conflict Resolutions
   *
   * Function iterates through the objects, displays a modal for each asking the user if they wish to overwrite it or not.
   *
   * @param {array} failures List of objects to request the user if they wish to overwrite it
   * @return {Promise<array>} An object with the key being "type:id" and value the resolution chosen by the user
   */
  getConflictResolutions = async (failures: FailedImportConflict[]) => {
    const resolutions: Record<string, RetryDecision> = {};
    for (const conflict of failures) {
      const [overwrite, destinationId] = await new Promise<[boolean, string | undefined]>(
        (done) => {
          this.setState({ conflictingRecord: { conflict, done } });
        }
      );
      if (overwrite) {
        const { type, id } = conflict.obj;
        resolutions[`${type}:${id}`] = {
          retry: true,
          options: { overwrite: true, ...(destinationId && { destinationId }) },
        };
      }
      this.setState({ conflictingRecord: undefined });
    }
    return resolutions;
  };

  /**
   * Resolve Import Errors
   *
   * Function goes through the failedImports and tries to resolve the issues.
   */
  resolveImportErrors = async () => {
    this.setState({
      error: undefined,
      status: 'loading',
      loadingMessage: undefined,
    });

    try {
      const updatedState = await resolveImportErrors({
        http: this.props.http,
        state: this.state,
        getConflictResolutions: this.getConflictResolutions,
      });
      this.setState(updatedState);
    } catch (e) {
      this.setState({
        status: 'error',
        error: getErrorMessage(e),
      });
    }
  };

  public get hasUnmatchedReferences() {
    return this.state.unmatchedReferences && this.state.unmatchedReferences.length > 0;
  }

  public get resolutions() {
    return this.state.unmatchedReferences!.reduce(
      (accum, { existingIndexPatternId, newIndexPatternId }) => {
        if (newIndexPatternId) {
          accum.push({
            oldId: existingIndexPatternId,
            newId: newIndexPatternId,
          });
        }
        return accum;
      },
      [] as Array<{ oldId: string; newId: string }>
    );
  }

  onIndexChanged = (id: string, e: any) => {
    const value = e.target.value;
    this.setState((state) => {
      const conflictIndex = state.unmatchedReferences?.findIndex(
        (conflict) => conflict.existingIndexPatternId === id
      );
      if (conflictIndex === undefined || conflictIndex === -1) {
        return state;
      }

      return {
        unmatchedReferences: [
          ...state.unmatchedReferences!.slice(0, conflictIndex),
          {
            ...state.unmatchedReferences![conflictIndex],
            newIndexPatternId: value,
          },
          ...state.unmatchedReferences!.slice(conflictIndex + 1),
        ],
      } as any;
    });
  };

  renderUnmatchedReferences() {
    const { unmatchedReferences, unmatchedReferencesTablePagination: tablePagination } = this.state;

    if (!unmatchedReferences) {
      return null;
    }

    const columns = [
      {
        field: 'existingIndexPatternId',
        name: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.renderConflicts.columnIdName',
          { defaultMessage: 'ID' }
        ),
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.renderConflicts.columnIdDescription',
          { defaultMessage: 'ID of the data view' }
        ),
        sortable: true,
      },
      {
        field: 'list',
        name: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.renderConflicts.columnCountName',
          { defaultMessage: 'Count' }
        ),
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.renderConflicts.columnCountDescription',
          { defaultMessage: 'How many affected objects' }
        ),
        render: (list: any[]) => {
          return <Fragment>{list.length}</Fragment>;
        },
      },
      {
        field: 'list',
        name: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.renderConflicts.columnSampleOfAffectedObjectsName',
          { defaultMessage: 'Sample of affected objects' }
        ),
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.renderConflicts.columnSampleOfAffectedObjectsDescription',
          { defaultMessage: 'Sample of affected objects' }
        ),
        render: (list: any[]) => {
          return (
            <ul style={{ listStyle: 'none' }}>
              {take(list, 3).map((obj, key) => (
                <li key={key}>{obj.title}</li>
              ))}
            </ul>
          );
        },
      },
      {
        field: 'existingIndexPatternId',
        name: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.renderConflicts.columnNewIndexPatternName',
          { defaultMessage: 'New data view' }
        ),
        render: (id: string) => {
          const options = [
            {
              text: '-- Skip Import --',
              value: '',
            },
            ...this.state.indexPatterns!.map(
              (indexPattern) =>
                ({
                  text: indexPattern.title,
                  value: indexPattern.id,
                  'data-test-subj': `indexPatternOption-${indexPattern.title}`,
                } as { text: string; value: string; 'data-test-subj'?: string })
            ),
          ];

          const selectedValue =
            unmatchedReferences?.find((unmatchedRef) => unmatchedRef.existingIndexPatternId === id)
              ?.newIndexPatternId ?? '';

          return (
            <EuiSelect
              value={selectedValue}
              data-test-subj={`managementChangeIndexSelection-${id}`}
              onChange={(e) => this.onIndexChanged(id, e)}
              options={options}
            />
          );
        },
      },
    ];

    const pagination = {
      ...tablePagination,
      pageSizeOptions: [5, 10, 25],
    };

    return (
      <EuiInMemoryTable
        items={unmatchedReferences as any[]}
        columns={columns}
        pagination={pagination}
        onTableChange={({ page }) => {
          if (page) {
            this.setState({
              unmatchedReferencesTablePagination: {
                pageSize: page.size,
                pageIndex: page.index,
              },
            });
          }
        }}
      />
    );
  }

  renderError() {
    const { error, status } = this.state;

    if (status !== 'error') {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.errorCalloutTitle"
              defaultMessage="Sorry, there was an error"
            />
          }
          color="danger"
        >
          <p data-test-subj="importSavedObjectsErrorText">{error}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  renderBody() {
    const { allowedTypes } = this.props;
    const {
      status,
      loadingMessage,
      failedImports = [],
      successfulImports = [],
      importMode,
      importWarnings,
    } = this.state;

    if (status === 'loading') {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingElastic size="xl" />
            <EuiSpacer size="m" />
            <EuiText>
              <p>{loadingMessage}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // Import summary for completed import
    if (status === 'success') {
      return (
        <ImportSummary
          basePath={this.props.http.basePath}
          failedImports={failedImports}
          successfulImports={successfulImports}
          importWarnings={importWarnings ?? []}
          allowedTypes={allowedTypes}
        />
      );
    }

    // Failed imports
    if (this.hasUnmatchedReferences) {
      return this.renderUnmatchedReferences();
    }

    return (
      <EuiForm>
        <EuiFormRow
          fullWidth
          label={
            <EuiTitle size="xs">
              <span>
                <FormattedMessage
                  id="savedObjectsManagement.objectsTable.flyout.selectFileToImportFormRowLabel"
                  defaultMessage="Select a file to import"
                />
              </span>
            </EuiTitle>
          }
        >
          <EuiFilePicker
            accept=".ndjson"
            fullWidth
            initialPromptText={
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.flyout.importPromptText"
                defaultMessage="Import"
              />
            }
            onChange={this.setImportFile}
          />
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <ImportModeControl
            initialValues={importMode}
            updateSelection={(newValues: ImportMode) => this.changeImportMode(newValues)}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }

  renderFooter() {
    const { status, file } = this.state;
    const { done, close } = this.props;

    let confirmButton;

    if (status === 'success') {
      confirmButton = (
        <EuiButton onClick={done} size="s" fill data-test-subj="importSavedObjectsDoneBtn">
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.flyout.importSuccessful.confirmButtonLabel"
            defaultMessage="Done"
          />
        </EuiButton>
      );
    } else if (this.hasUnmatchedReferences) {
      confirmButton = (
        <EuiButton
          onClick={this.resolveImportErrors}
          size="s"
          fill
          isLoading={status === 'loading'}
          data-test-subj="importSavedObjectsConfirmBtn"
        >
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.flyout.importSuccessful.confirmAllChangesButtonLabel"
            defaultMessage="Confirm all changes"
          />
        </EuiButton>
      );
    } else {
      confirmButton = (
        <EuiButton
          onClick={this.import}
          size="s"
          fill
          isDisabled={file === undefined}
          isLoading={status === 'loading'}
          data-test-subj="importSavedObjectsImportBtn"
        >
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.flyout.import.confirmButtonLabel"
            defaultMessage="Import"
          />
        </EuiButton>
      );
    }

    return (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={close}
            size="s"
            disabled={status === 'loading' || status === 'success'}
            data-test-subj="importSavedObjectsCancelBtn"
          >
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.import.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{confirmButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderSubheader() {
    if (this.state.status === 'loading' || this.state.status === 'success') {
      return null;
    }

    let indexPatternConflictsWarning;
    if (this.hasUnmatchedReferences) {
      indexPatternConflictsWarning = (
        <EuiCallOut
          data-test-subj="importSavedObjectsConflictsWarning"
          title={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.indexPatternConflictsTitle"
              defaultMessage="Data Views Conflicts"
            />
          }
          color="warning"
          iconType="help"
        >
          <p>
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.indexPatternConflictsDescription"
              defaultMessage="The following saved objects use data views that do not exist.
              Please select the data views you'd like re-associated with
              them. You can {indexPatternLink} if necessary."
              values={{
                indexPatternLink: (
                  <EuiLink href={this.props.newIndexPatternUrl}>
                    <FormattedMessage
                      id="savedObjectsManagement.objectsTable.flyout.indexPatternConflictsCalloutLinkText"
                      defaultMessage="create a new data view"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      );
    }

    if (!indexPatternConflictsWarning) {
      return null;
    }

    return (
      <Fragment>
        {indexPatternConflictsWarning && (
          <span>
            <EuiSpacer size="s" />
            {indexPatternConflictsWarning}
          </span>
        )}
      </Fragment>
    );
  }

  render() {
    const { close } = this.props;

    let confirmOverwriteModal: ReactNode;
    const { conflictingRecord } = this.state;
    if (conflictingRecord) {
      const { conflict } = conflictingRecord;
      const onFinish = (overwrite: boolean, destinationId?: string) =>
        conflictingRecord.done([overwrite, destinationId]);
      confirmOverwriteModal = <OverwriteModal {...{ conflict, onFinish }} />;
    }

    return (
      <EuiFlyout onClose={close} size="s" data-test-subj="importSavedObjectsFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.flyout.importSavedObjectTitle"
                defaultMessage="Import saved objects"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {this.renderSubheader()}
          {this.renderError()}
          {this.renderBody()}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>{this.renderFooter()}</EuiFlyoutFooter>
        {confirmOverwriteModal}
      </EuiFlyout>
    );
  }
}
