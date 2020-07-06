/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component, Fragment } from 'react';
import { take, get as getField } from 'lodash';
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
  EuiSwitch,
  EuiFilePicker,
  EuiInMemoryTable,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingKibana,
  EuiCallOut,
  EuiSpacer,
  EuiLink,
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { OverlayStart, HttpStart } from 'src/core/public';
import {
  IndexPatternsContract,
  IIndexPattern,
  DataPublicPluginStart,
} from '../../../../../data/public';
import {
  importFile,
  importLegacyFile,
  resolveImportErrors,
  logLegacyImport,
  getDefaultTitle,
  processImportResponse,
  ProcessedImportResponse,
} from '../../../lib';
import {
  resolveSavedObjects,
  resolveSavedSearches,
  resolveIndexPatternConflicts,
  saveObjects,
} from '../../../lib/resolve_saved_objects';
import { ISavedObjectsManagementServiceRegistry } from '../../../services';

export interface FlyoutProps {
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  allowedTypes: string[];
  close: () => void;
  done: () => void;
  newIndexPatternUrl: string;
  indexPatterns: IndexPatternsContract;
  overlays: OverlayStart;
  http: HttpStart;
  search: DataPublicPluginStart['search'];
}

export interface FlyoutState {
  conflictedIndexPatterns?: any[];
  conflictedSavedObjectsLinkedToSavedSearches?: any[];
  conflictedSearchDocs?: any[];
  unmatchedReferences?: ProcessedImportResponse['unmatchedReferences'];
  failedImports?: ProcessedImportResponse['failedImports'];
  conflictingRecord?: ConflictingRecord;
  error?: string;
  file?: File;
  importCount: number;
  indexPatterns?: IIndexPattern[];
  isOverwriteAllChecked: boolean;
  loadingMessage?: string;
  isLegacyFile: boolean;
  status: string;
}

interface ConflictingRecord {
  id: string;
  type: string;
  title: string;
  done: (success: boolean) => void;
}

export class Flyout extends Component<FlyoutProps, FlyoutState> {
  constructor(props: FlyoutProps) {
    super(props);

    this.state = {
      conflictedIndexPatterns: undefined,
      conflictedSavedObjectsLinkedToSavedSearches: undefined,
      conflictedSearchDocs: undefined,
      unmatchedReferences: undefined,
      conflictingRecord: undefined,
      error: undefined,
      file: undefined,
      importCount: 0,
      indexPatterns: undefined,
      isOverwriteAllChecked: true,
      loadingMessage: undefined,
      isLegacyFile: false,
      status: 'idle',
    };
  }

  componentDidMount() {
    this.fetchIndexPatterns();
  }

  fetchIndexPatterns = async () => {
    const indexPatterns = await this.props.indexPatterns.getFields(['id', 'title']);
    this.setState({ indexPatterns } as any);
  };

  changeOverwriteAll = () => {
    this.setState((state) => ({
      isOverwriteAllChecked: !state.isOverwriteAllChecked,
    }));
  };

  setImportFile = (files: FileList | null) => {
    if (!files || !files[0]) {
      this.setState({ file: undefined, isLegacyFile: false });
      return;
    }
    const file = files[0];
    this.setState({
      file,
      isLegacyFile: /\.json$/i.test(file.name) || file.type === 'application/json',
    });
  };

  /**
   * Import
   *
   * Does the initial import of a file, resolveImportErrors then handles errors and retries
   */
  import = async () => {
    const { http } = this.props;
    const { file, isOverwriteAllChecked } = this.state;
    this.setState({ status: 'loading', error: undefined });

    // Import the file
    try {
      const response = await importFile(http, file!, isOverwriteAllChecked);
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
        error: i18n.translate('savedObjectsManagement.objectsTable.flyout.importFileErrorMessage', {
          defaultMessage: 'The file could not be processed.',
        }),
      });
      return;
    }
  };

  /**
   * Get Conflict Resolutions
   *
   * Function iterates through the objects, displays a modal for each asking the user if they wish to overwrite it or not.
   *
   * @param {array} objects List of objects to request the user if they wish to overwrite it
   * @return {Promise<array>} An object with the key being "type:id" and value the resolution chosen by the user
   */
  getConflictResolutions = async (objects: any[]) => {
    const resolutions: Record<string, boolean> = {};
    for (const { type, id, title } of objects) {
      const overwrite = await new Promise<boolean>((resolve) => {
        this.setState({
          conflictingRecord: {
            id,
            type,
            title,
            done: resolve,
          },
        });
      });
      resolutions[`${type}:${id}`] = overwrite;
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
        error: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.resolveImportErrorsFileErrorMessage',
          { defaultMessage: 'The file could not be processed.' }
        ),
      });
    }
  };

  legacyImport = async () => {
    const { serviceRegistry, indexPatterns, overlays, http, allowedTypes } = this.props;
    const { file, isOverwriteAllChecked } = this.state;

    this.setState({ status: 'loading', error: undefined });

    // Log warning on server, don't wait for response
    logLegacyImport(http);

    let contents;
    try {
      contents = await importLegacyFile(file!);
    } catch (e) {
      this.setState({
        status: 'error',
        error: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.importLegacyFileErrorMessage',
          { defaultMessage: 'The file could not be processed.' }
        ),
      });
      return;
    }

    if (!Array.isArray(contents)) {
      this.setState({
        status: 'error',
        error: i18n.translate(
          'savedObjectsManagement.objectsTable.flyout.invalidFormatOfImportedFileErrorMessage',
          { defaultMessage: 'Saved objects file format is invalid and cannot be imported.' }
        ),
      });
      return;
    }

    contents = contents
      .filter((content) => allowedTypes.includes(content._type))
      .map((doc) => ({
        ...doc,
        // The server assumes that documents with no migrationVersion are up to date.
        // That assumption enables Kibana and other API consumers to not have to build
        // up migrationVersion prior to creating new objects. But it means that imports
        // need to set migrationVersion to something other than undefined, so that imported
        // docs are not seen as automatically up-to-date.
        _migrationVersion: doc._migrationVersion || {},
      }));

    const {
      conflictedIndexPatterns,
      conflictedSavedObjectsLinkedToSavedSearches,
      conflictedSearchDocs,
      importedObjectCount,
      failedImports,
    } = await resolveSavedObjects(
      contents,
      isOverwriteAllChecked,
      serviceRegistry.all().map((e) => e.service),
      indexPatterns,
      overlays.openConfirm
    );

    const byId: Record<string, any[]> = {};
    conflictedIndexPatterns
      .map(({ doc, obj }) => {
        return { doc, obj: obj._serialize() };
      })
      .forEach(({ doc, obj }) =>
        obj.references.forEach((ref: Record<string, any>) => {
          byId[ref.id] = byId[ref.id] != null ? byId[ref.id].concat({ doc, obj }) : [{ doc, obj }];
        })
      );
    const unmatchedReferences = Object.entries(byId).reduce(
      (accum, [existingIndexPatternId, list]) => {
        accum.push({
          existingIndexPatternId,
          newIndexPatternId: undefined,
          list: list.map(({ doc }) => ({
            id: existingIndexPatternId,
            type: doc._type,
            title: doc._source.title,
          })),
        });
        return accum;
      },
      [] as any[]
    );

    this.setState({
      conflictedIndexPatterns,
      conflictedSavedObjectsLinkedToSavedSearches,
      conflictedSearchDocs,
      failedImports,
      unmatchedReferences,
      importCount: importedObjectCount,
      status: unmatchedReferences.length === 0 ? 'success' : 'idle',
    });
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

  confirmLegacyImport = async () => {
    const {
      conflictedIndexPatterns,
      isOverwriteAllChecked,
      conflictedSavedObjectsLinkedToSavedSearches,
      conflictedSearchDocs,
      failedImports,
    } = this.state;

    const { serviceRegistry, indexPatterns, search } = this.props;

    this.setState({
      error: undefined,
      status: 'loading',
      loadingMessage: undefined,
    });

    let importCount = this.state.importCount;

    if (this.hasUnmatchedReferences) {
      try {
        const resolutions = this.resolutions;

        // Do not Promise.all these calls as the order matters
        this.setState({
          loadingMessage: i18n.translate(
            'savedObjectsManagement.objectsTable.flyout.confirmLegacyImport.resolvingConflictsLoadingMessage',
            { defaultMessage: 'Resolving conflicts…' }
          ),
        });
        if (resolutions.length) {
          importCount += await resolveIndexPatternConflicts(
            resolutions,
            conflictedIndexPatterns!,
            isOverwriteAllChecked,
            {
              indexPatterns,
              search,
            }
          );
        }
        this.setState({
          loadingMessage: i18n.translate(
            'savedObjectsManagement.objectsTable.flyout.confirmLegacyImport.savingConflictsLoadingMessage',
            { defaultMessage: 'Saving conflicts…' }
          ),
        });
        importCount += await saveObjects(
          conflictedSavedObjectsLinkedToSavedSearches!,
          isOverwriteAllChecked
        );
        this.setState({
          loadingMessage: i18n.translate(
            'savedObjectsManagement.objectsTable.flyout.confirmLegacyImport.savedSearchAreLinkedProperlyLoadingMessage',
            { defaultMessage: 'Ensure saved searches are linked properly…' }
          ),
        });
        importCount += await resolveSavedSearches(
          conflictedSearchDocs!,
          serviceRegistry.all().map((e) => e.service),
          indexPatterns,
          isOverwriteAllChecked
        );
        this.setState({
          loadingMessage: i18n.translate(
            'savedObjectsManagement.objectsTable.flyout.confirmLegacyImport.retryingFailedObjectsLoadingMessage',
            { defaultMessage: 'Retrying failed objects…' }
          ),
        });
        importCount += await saveObjects(
          failedImports!.map(({ obj }) => obj) as any[],
          isOverwriteAllChecked
        );
      } catch (e) {
        this.setState({
          error: e.message,
          status: 'error',
          loadingMessage: undefined,
        });
        return;
      }
    }

    this.setState({ status: 'success', importCount });
  };

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
    const { unmatchedReferences } = this.state;

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
          { defaultMessage: 'ID of the index pattern' }
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
          { defaultMessage: 'New index pattern' }
        ),
        render: (id: string) => {
          const options = this.state.indexPatterns!.map(
            (indexPattern) =>
              ({
                text: indexPattern.title,
                value: indexPattern.id,
                'data-test-subj': `indexPatternOption-${indexPattern.title}`,
              } as { text: string; value: string; 'data-test-subj'?: string })
          );

          options.unshift({
            text: '-- Skip Import --',
            value: '',
          });

          return (
            <EuiSelect
              data-test-subj={`managementChangeIndexSelection-${id}`}
              onChange={(e) => this.onIndexChanged(id, e)}
              options={options}
            />
          );
        },
      },
    ];

    const pagination = {
      pageSizeOptions: [5, 10, 25],
    };

    return (
      <EuiInMemoryTable
        items={unmatchedReferences as any[]}
        columns={columns}
        pagination={pagination}
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
          <p>{error}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  renderBody() {
    const {
      status,
      loadingMessage,
      isOverwriteAllChecked,
      importCount,
      failedImports = [],
      isLegacyFile,
    } = this.state;

    if (status === 'loading') {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingKibana size="xl" />
            <EuiSpacer size="m" />
            <EuiText>
              <p>{loadingMessage}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // Kept backwards compatible logic
    if (
      failedImports.length &&
      (!this.hasUnmatchedReferences || (isLegacyFile === false && status === 'success'))
    ) {
      return (
        <EuiCallOut
          data-test-subj="importSavedObjectsFailedWarning"
          title={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.importFailedTitle"
              defaultMessage="Import failed"
            />
          }
          color="warning"
          iconType="help"
        >
          <p>
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.importFailedDescription"
              defaultMessage="Failed to import {failedImportCount} of {totalImportCount} objects. Import failed"
              values={{
                failedImportCount: failedImports.length,
                totalImportCount: importCount + failedImports.length,
              }}
            />
          </p>
          <p>
            {failedImports
              .map(({ error, obj }) => {
                if (error.type === 'missing_references') {
                  return error.references.map((reference) => {
                    return i18n.translate(
                      'savedObjectsManagement.objectsTable.flyout.importFailedMissingReference',
                      {
                        defaultMessage: '{type} [id={id}] could not locate {refType} [id={refId}]',
                        values: {
                          id: obj.id,
                          type: obj.type,
                          refId: reference.id,
                          refType: reference.type,
                        },
                      }
                    );
                  });
                } else if (error.type === 'unsupported_type') {
                  return i18n.translate(
                    'savedObjectsManagement.objectsTable.flyout.importFailedUnsupportedType',
                    {
                      defaultMessage: '{type} [id={id}] unsupported type',
                      values: {
                        id: obj.id,
                        type: obj.type,
                      },
                    }
                  );
                }
                return getField(error, 'body.message', (error as any).message ?? '');
              })
              .join(' ')}
          </p>
        </EuiCallOut>
      );
    }

    if (status === 'success') {
      if (importCount === 0) {
        return (
          <EuiCallOut
            data-test-subj="importSavedObjectsSuccessNoneImported"
            title={
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.flyout.importSuccessfulCallout.noObjectsImportedTitle"
                defaultMessage="No objects imported"
              />
            }
            color="primary"
          />
        );
      }

      return (
        <EuiCallOut
          data-test-subj="importSavedObjectsSuccess"
          title={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.importSuccessfulTitle"
              defaultMessage="Import successful"
            />
          }
          color="success"
          iconType="check"
        >
          <p>
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.importSuccessfulDescription"
              defaultMessage="Successfully imported {importCount} objects."
              values={{ importCount }}
            />
          </p>
        </EuiCallOut>
      );
    }

    if (this.hasUnmatchedReferences) {
      return this.renderUnmatchedReferences();
    }

    return (
      <EuiForm>
        <EuiFormRow
          label={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.selectFileToImportFormRowLabel"
              defaultMessage="Please select a file to import"
            />
          }
        >
          <EuiFilePicker
            initialPromptText={
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.flyout.importPromptText"
                defaultMessage="Import"
              />
            }
            onChange={this.setImportFile}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiSwitch
            name="overwriteAll"
            label={
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.flyout.overwriteSavedObjectsLabel"
                defaultMessage="Automatically overwrite all saved objects?"
              />
            }
            data-test-subj="importSavedObjectsOverwriteToggle"
            checked={isOverwriteAllChecked}
            onChange={this.changeOverwriteAll}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }

  renderFooter() {
    const { status } = this.state;
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
          onClick={this.state.isLegacyFile ? this.confirmLegacyImport : this.resolveImportErrors}
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
          onClick={this.state.isLegacyFile ? this.legacyImport : this.import}
          size="s"
          fill
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
          <EuiButtonEmpty onClick={close} size="s">
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

    let legacyFileWarning;
    if (this.state.isLegacyFile) {
      legacyFileWarning = (
        <EuiCallOut
          data-test-subj="importSavedObjectsLegacyWarning"
          title={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.legacyFileUsedTitle"
              defaultMessage="Support for JSON files is going away"
            />
          }
          color="warning"
          iconType="help"
        >
          <p>
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.legacyFileUsedBody"
              defaultMessage="Use our updated export to generate NDJSON files, and you'll be all set."
            />
          </p>
        </EuiCallOut>
      );
    }

    let indexPatternConflictsWarning;
    if (this.hasUnmatchedReferences) {
      indexPatternConflictsWarning = (
        <EuiCallOut
          data-test-subj="importSavedObjectsConflictsWarning"
          title={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.indexPatternConflictsTitle"
              defaultMessage="Index Pattern Conflicts"
            />
          }
          color="warning"
          iconType="help"
        >
          <p>
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.flyout.indexPatternConflictsDescription"
              defaultMessage="The following saved objects use index patterns that do not exist.
              Please select the index patterns you'd like re-associated with
              them. You can {indexPatternLink} if necessary."
              values={{
                indexPatternLink: (
                  <EuiLink href={this.props.newIndexPatternUrl}>
                    <FormattedMessage
                      id="savedObjectsManagement.objectsTable.flyout.indexPatternConflictsCalloutLinkText"
                      defaultMessage="create a new index pattern"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      );
    }

    if (!legacyFileWarning && !indexPatternConflictsWarning) {
      return null;
    }

    return (
      <Fragment>
        {legacyFileWarning && (
          <span>
            <EuiSpacer size="s" />
            {legacyFileWarning}
          </span>
        )}
        {indexPatternConflictsWarning && (
          <span>
            <EuiSpacer size="s" />
            {indexPatternConflictsWarning}
          </span>
        )}
      </Fragment>
    );
  }

  overwriteConfirmed() {
    this.state.conflictingRecord!.done(true);
  }

  overwriteSkipped() {
    this.state.conflictingRecord!.done(false);
  }

  render() {
    const { close } = this.props;

    let confirmOverwriteModal;
    if (this.state.conflictingRecord) {
      confirmOverwriteModal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate(
              'savedObjectsManagement.objectsTable.flyout.confirmOverwriteTitle',
              {
                defaultMessage: 'Overwrite {type}?',
                values: { type: this.state.conflictingRecord.type },
              }
            )}
            cancelButtonText={i18n.translate(
              'savedObjectsManagement.objectsTable.flyout.confirmOverwriteCancelButtonText',
              { defaultMessage: 'Cancel' }
            )}
            confirmButtonText={i18n.translate(
              'savedObjectsManagement.objectsTable.flyout.confirmOverwriteOverwriteButtonText',
              { defaultMessage: 'Overwrite' }
            )}
            buttonColor="danger"
            onCancel={this.overwriteSkipped.bind(this)}
            onConfirm={this.overwriteConfirmed.bind(this)}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.flyout.confirmOverwriteBody"
                defaultMessage="Are you sure you want to overwrite {title}?"
                values={{
                  title:
                    this.state.conflictingRecord.title ||
                    getDefaultTitle(this.state.conflictingRecord),
                }}
              />
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <EuiFlyout onClose={close} size="s">
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
