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
import PropTypes from 'prop-types';
import { groupBy, take, get as getField } from 'lodash';
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
import { importFile, importLegacyFile, resolveImportErrors } from '../../../../lib';
import {
  resolveSavedObjects,
  resolveSavedSearches,
  resolveIndexPatternConflicts,
  saveObjects,
} from '../../../../lib/resolve_saved_objects';
import { INCLUDED_TYPES } from '../../objects_table';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class FlyoutUI extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    services: PropTypes.array.isRequired,
    newIndexPatternUrl: PropTypes.string.isRequired,
    indexPatterns: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      conflictedIndexPatterns: undefined,
      conflictedSavedObjectsLinkedToSavedSearches: undefined,
      conflictedSearchDocs: undefined,
      unmatchedReferences: undefined,
      conflictingRecord: undefined,
      objectsToOverwrite: undefined,
      objectsToRetry: undefined,
      error: undefined,
      file: undefined,
      importCount: 0,
      indexPatterns: undefined,
      isOverwriteAllChecked: true,
      isLoading: false,
      loadingMessage: undefined,
      wasImportSuccessful: false,
      isLegacyFile: false,
    };
  }

  componentDidMount() {
    this.fetchIndexPatterns();
  }

  fetchIndexPatterns = async () => {
    const indexPatterns = await this.props.indexPatterns.getFields([
      'id',
      'title',
    ]);
    this.setState({ indexPatterns });
  };

  changeOverwriteAll = () => {
    this.setState(state => ({
      isOverwriteAllChecked: !state.isOverwriteAllChecked,
    }));
  };

  setImportFile = ([file]) => {
    this.setState({
      file,
      isLegacyFile: /\.json$/i.test(file.name) || file.type === 'application/json',
    });
  };

  import = async () => {
    const { file, isOverwriteAllChecked } = this.state;
    this.setState({ isLoading: true, error: undefined });

    const response = await importFile(file, isOverwriteAllChecked);

    const failedImports = [];
    const unmatchedReferences = new Map();
    for (const { error, ...obj } of response.errors || []) {
      if (error.type === 'missing_references') {
        for (const missingReference of error.references) {
          if (missingReference.type !== 'index-pattern') {
            // Currently only supports resolving conflicts on index patterns
            continue;
          }
          const conflict = unmatchedReferences.get(`${missingReference.type}:${missingReference.id}`) || {
            existingIndexPatternId: missingReference.id,
            list: [],
            newIndexPatternId: undefined,
          };
          conflict.list.push(obj);
          unmatchedReferences.set(`${missingReference.type}:${missingReference.id}`, conflict);
        }
        failedImports.push({ obj, error });
      } else {
        failedImports.push({ obj, error });
      }
    }

    this.setState({
      failedImports,
      unmatchedReferences: Array.from(unmatchedReferences.values()),
      isLoading: false,
      importCount: response.successCount,
      wasImportSuccessful: unmatchedReferences.size === 0 && !failedImports.some(issue => issue.error && issue.error.type === 'conflict'),
      conflictedSavedObjectsLinkedToSavedSearches: undefined,
      conflictedSearchDocs: undefined,
      possibleRecordsToOverwrite: (response.errors || []).filter(obj => obj.error.type === 'conflict'),
    });

    if (unmatchedReferences.size === 0) {
      this.resolveImportErrors();
    }
  }

  async getConflictResolutions(objects) {
    const resolutions = {};
    for (const { type, id, title } of objects) {
      const overwrite = await new Promise((resolve) => {
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
  }

  mapImportFailureToRetryObject = ({ error, obj, overwriteDecisionCache, replaceReferencesCache }) => {
    const { isOverwriteAllChecked, unmatchedReferences } = this.state;
    const isOverwriteGranted = isOverwriteAllChecked || overwriteDecisionCache[`${obj.type}:${obj.id}`] === true;
    if (!isOverwriteGranted && error.type === 'conflict') {
      return;
    }
    if (error.type === 'missing_references') {
      const objReplaceReferences = replaceReferencesCache.get(`${obj.type}:${obj.id}`) || [];
      for (const reference of error.references) {
        if (reference.type !== 'index-pattern') {
          continue;
        }
        for (const unmatchedReference of unmatchedReferences) {
          if (!unmatchedReference.newIndexPatternId || unmatchedReference.existingIndexPatternId !== reference.id) {
            continue;
          }
          if (objReplaceReferences.some(replaceReference => replaceReference.from === reference.id)) {
            continue;
          }
          objReplaceReferences.push({
            type: 'index-pattern',
            from: unmatchedReference.existingIndexPatternId,
            to: unmatchedReference.newIndexPatternId,
          });
        }
      }
      replaceReferencesCache.set(`${obj.type}:${obj.id}`, objReplaceReferences);
      if (objReplaceReferences.length === 0) {
        return;
      }
    }
    return {
      id: obj.id,
      type: obj.type,
      overwrite: isOverwriteAllChecked || overwriteDecisionCache[`${obj.type}:${obj.id}`] === true,
      replaceReferences: replaceReferencesCache.get(`${obj.type}:${obj.id}`) || [],
    };
  }

  resolveImportErrors = async () => {
    this.setState({
      error: undefined,
      isLoading: true,
      loadingMessage: undefined,
    });

    let overwriteDecisionCache = {};
    const replaceReferencesCache = new Map();
    const { file, isOverwriteAllChecked } = this.state;
    let { importCount: successImportCount, failedImports: importFailures } = this.state;
    function getOverwriteDecision({ obj }) {
      return !overwriteDecisionCache.hasOwnProperty(`${obj.type}:${obj.id}`);
    }
    const callMap = (failure) => {
      return this.mapImportFailureToRetryObject({ overwriteDecisionCache, replaceReferencesCache, ...failure });
    };

    // Loop until all issues are resolved
    while (importFailures.some(failure => ['conflict', 'missing_references'].includes(failure.error.type))) {
      if (!isOverwriteAllChecked) {
        const result = await this.getConflictResolutions(
          importFailures
            .filter(({ error }) => error.type === 'conflict')
            .filter(getOverwriteDecision)
            .map(({ obj }) => obj)
        );
        overwriteDecisionCache = { ...overwriteDecisionCache, ...result };
      }
      const retries = importFailures
        .map(callMap)
        .filter(obj => !!obj);
      if (retries.length === 0) {
        // Scenario where skip everything, no other failures
        importFailures = [];
        continue;
      }
      const response = await resolveImportErrors(file, retries);
      successImportCount += response.successCount;
      importFailures = [];
      for (const { error, ...obj } of response.errors || []) {
        importFailures.push({ error, obj });
      }
    }

    this.setState({
      isLoading: false,
      wasImportSuccessful: true,
      importCount: successImportCount,
      failedImports: importFailures,
    });
  }

  legacyImport = async () => {
    const { services, indexPatterns, intl } = this.props;
    const { file, isOverwriteAllChecked } = this.state;

    this.setState({ isLoading: true, error: undefined });

    let contents;

    try {
      contents = await importLegacyFile(file);
    } catch (e) {
      this.setState({
        isLoading: false,
        error: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.importLegacyFileErrorMessage',
          defaultMessage: 'The file could not be processed.',
        }),
      });
      return;
    }

    if (!Array.isArray(contents)) {
      this.setState({
        isLoading: false,
        error: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.invalidFormatOfImportedFileErrorMessage',
          defaultMessage: 'Saved objects file format is invalid and cannot be imported.',
        }),
      });
      return;
    }

    contents = contents.filter(content =>
      INCLUDED_TYPES.includes(content._type)
    ).map(doc => ({
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
      services,
      indexPatterns
    );

    const byId = groupBy(conflictedIndexPatterns, ({ obj }) =>
      obj.searchSource.getOwnField('index')
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
      []
    );

    this.setState({
      conflictedIndexPatterns,
      conflictedSavedObjectsLinkedToSavedSearches,
      conflictedSearchDocs,
      failedImports,
      unmatchedReferences,
      importCount: importedObjectCount,
      isLoading: false,
      wasImportSuccessful: unmatchedReferences.length === 0,
    });
  };

  get hasUnmatchedReferences() {
    return this.state.unmatchedReferences && this.state.unmatchedReferences.length > 0;
  }

  get resolutions() {
    return this.state.unmatchedReferences.reduce(
      (accum, { existingIndexPatternId, newIndexPatternId }) => {
        if (newIndexPatternId) {
          accum.push({
            oldId: existingIndexPatternId,
            newId: newIndexPatternId,
          });
        }
        return accum;
      },
      []
    );
  }

  confirmLegacyImport = async () => {
    const {
      conflictedIndexPatterns,
      isOverwriteAllChecked,
      conflictedSavedObjectsLinkedToSavedSearches,
      conflictedSearchDocs,
      failedImports
    } = this.state;

    const { services, indexPatterns, intl } = this.props;

    this.setState({
      error: undefined,
      isLoading: true,
      loadingMessage: undefined,
    });

    let importCount = this.state.importCount;

    if (this.hasUnmatchedReferences) {
      try {
        const resolutions = this.resolutions;

        // Do not Promise.all these calls as the order matters
        this.setState({
          loadingMessage: intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.flyout.confirmLegacyImport.resolvingConflictsLoadingMessage',
            defaultMessage: 'Resolving conflicts…',
          }),
        });
        if (resolutions.length) {
          importCount += await resolveIndexPatternConflicts(
            resolutions,
            conflictedIndexPatterns,
            isOverwriteAllChecked
          );
        }
        this.setState({
          loadingMessage: intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.flyout.confirmLegacyImport.savingConflictsLoadingMessage',
            defaultMessage: 'Saving conflicts…',
          }),
        });
        importCount += await saveObjects(
          conflictedSavedObjectsLinkedToSavedSearches,
          isOverwriteAllChecked
        );
        this.setState({
          loadingMessage: intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.flyout.confirmLegacyImport.savedSearchAreLinkedProperlyLoadingMessage',
            defaultMessage: 'Ensure saved searches are linked properly…',
          }),
        });
        importCount += await resolveSavedSearches(
          conflictedSearchDocs,
          services,
          indexPatterns,
          isOverwriteAllChecked
        );
        this.setState({
          loadingMessage: intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.flyout.confirmLegacyImport.retryingFailedObjectsLoadingMessage',
            defaultMessage: 'Retrying failed objects…',
          }),
        });
        importCount += await saveObjects(
          failedImports.map(({ obj }) => obj),
          isOverwriteAllChecked
        );
      } catch (e) {
        this.setState({
          error: e.message,
          isLoading: false,
          loadingMessage: undefined,
        });
        return;
      }
    }

    this.setState({ isLoading: false, wasImportSuccessful: true, importCount });
  };

  onIndexChanged = (id, e) => {
    const value = e.target.value;
    this.setState(state => {
      const conflictIndex = state.unmatchedReferences.findIndex(
        conflict => conflict.existingIndexPatternId === id
      );
      if (conflictIndex === -1) {
        return state;
      }

      return {
        unmatchedReferences: [
          ...state.unmatchedReferences.slice(0, conflictIndex),
          {
            ...state.unmatchedReferences[conflictIndex],
            newIndexPatternId: value,
          },
          ...state.unmatchedReferences.slice(conflictIndex + 1),
        ],
      };
    });
  };

  renderUnmatchedReferences() {
    const { unmatchedReferences } = this.state;
    const { intl } = this.props;

    if (!unmatchedReferences) {
      return null;
    }

    const columns = [
      {
        field: 'existingIndexPatternId',
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.renderConflicts.columnIdName',
          defaultMessage: 'ID',
        }),
        description: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.renderConflicts.columnIdDescription',
          defaultMessage: 'ID of the index pattern',
        }),
        sortable: true,
      },
      {
        field: 'list',
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.renderConflicts.columnCountName',
          defaultMessage: 'Count',
        }),
        description: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.renderConflicts.columnCountDescription',
          defaultMessage: 'How many affected objects',
        }),
        render: list => {
          return <Fragment>{list.length}</Fragment>;
        },
      },
      {
        field: 'list',
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.renderConflicts.columnSampleOfAffectedObjectsName',
          defaultMessage: 'Sample of affected objects',
        }),
        description: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.renderConflicts.columnSampleOfAffectedObjectsDescription',
          defaultMessage: 'Sample of affected objects',
        }),
        render: list => {
          return (
            <ul style={{ listStyle: 'none' }}>
              {take(list, 3).map((obj, key) => <li key={key}>{obj.title}</li>)}
            </ul>
          );
        },
      },
      {
        field: 'existingIndexPatternId',
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.flyout.renderConflicts.columnNewIndexPatternName',
          defaultMessage: 'New index pattern',
        }),
        render: id => {
          const options = this.state.indexPatterns.map(indexPattern => ({
            text: indexPattern.get('title'),
            value: indexPattern.id,
            ['data-test-subj']: `indexPatternOption-${indexPattern.get('title')}`,
          }));

          options.unshift({
            text: '-- Skip Import --',
            value: '',
          });

          return (
            <EuiSelect
              data-test-subj={`managementChangeIndexSelection-${id}`}
              onChange={e => this.onIndexChanged(id, e)}
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
        items={unmatchedReferences}
        columns={columns}
        pagination={pagination}
      />
    );
  }

  renderError() {
    const { error } = this.state;

    if (!error) {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          title={(
            <FormattedMessage id="kbn.management.objects.objectsTable.flyout.errorCalloutTitle" defaultMessage="Sorry, there was an error"/>
          )}
          color="danger"
          iconType="cross"
        >
          <p>{error}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  renderBody() {
    const { intl } = this.props;
    const {
      isLoading,
      loadingMessage,
      isOverwriteAllChecked,
      wasImportSuccessful,
      importCount,
      failedImports = [],
    } = this.state;

    if (isLoading) {
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

    if (failedImports.length && !this.hasUnmatchedReferences) {
      return (
        <EuiCallOut
          title={(
            <FormattedMessage id="kbn.management.objects.objectsTable.flyout.importFailedTitle" defaultMessage="Import failed"/>
          )}
          color="warning"
          iconType="help"
        >
          <p>
            <FormattedMessage
              id="kbn.management.objects.objectsTable.flyout.importFailedDescription"
              defaultMessage="Failed to import {failedImportCount} of {totalImportCount} objects. Import failed"
              values={{ failedImportCount: failedImports.length, totalImportCount: importCount + failedImports.length, }}
            />
          </p>
          <p>
            {failedImports.map(({ error, obj }) => {
              if (error.type === 'missing_references') {
                return error.references.map((reference) => {
                  return intl.formatMessage(
                    {
                      id: 'kbn.management.objects.objectsTable.flyout.importFailedMissingReference',
                      defaultMessage: '{type} (id: {id}) could not locate {refType} (id: {refId})',
                    },
                    {
                      id: obj.id,
                      type: obj.type,
                      refId: reference.id,
                      refType: reference.type,
                    }
                  );
                });
              }
              return getField(error, 'body.message', error.message || '');
            }).join(' ')}
          </p>
        </EuiCallOut>
      );
    }

    if (wasImportSuccessful) {
      if (importCount === 0) {
        return (
          <EuiCallOut
            data-test-subj="importSavedObjectsSuccessNoneImported"
            title={(
              <FormattedMessage
                id="kbn.management.objects.objectsTable.flyout.importSuccessfulCallout.noObjectsImportedTitle"
                defaultMessage="No objects imported"
              />
            )}
            color="primary"
          />
        );
      }

      return (
        <EuiCallOut
          data-test-subj="importSavedObjectsSuccess"
          title={(
            <FormattedMessage
              id="kbn.management.objects.objectsTable.flyout.importSuccessfulTitle"
              defaultMessage="Import successful"
            />
          )}
          color="success"
          iconType="check"
        >
          <p>
            <FormattedMessage
              id="kbn.management.objects.objectsTable.flyout.importSuccessfulDescription"
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
          label={(
            <FormattedMessage
              id="kbn.management.objects.objectsTable.flyout.selectFileToImportFormRowLabel"
              defaultMessage="Please select a file to import"
            />
          )}
        >
          <EuiFilePicker
            initialPromptText={(
              <FormattedMessage
                id="kbn.management.objects.objectsTable.flyout.importPromptText"
                defaultMessage="Import"
              />
            )}
            onChange={this.setImportFile}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiSwitch
            name="overwriteAll"
            label={(
              <FormattedMessage
                id="kbn.management.objects.objectsTable.flyout.overwriteSavedObjectsLabel"
                defaultMessage="Automatically overwrite all saved objects?"
              />
            )}
            data-test-subj="importSavedObjectsOverwriteToggle"
            checked={isOverwriteAllChecked}
            onChange={this.changeOverwriteAll}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }

  renderFooter() {
    const { isLoading, wasImportSuccessful } = this.state;
    const { done, close } = this.props;

    let confirmButton;

    if (wasImportSuccessful) {
      confirmButton = (
        <EuiButton
          onClick={done}
          size="s"
          fill
          data-test-subj="importSavedObjectsDoneBtn"
        >
          <FormattedMessage
            id="kbn.management.objects.objectsTable.flyout.importSuccessful.confirmButtonLabel"
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
          isLoading={isLoading}
          data-test-subj="importSavedObjectsConfirmBtn"
        >
          <FormattedMessage
            id="kbn.management.objects.objectsTable.flyout.importSuccessful.confirmAllChangesButtonLabel"
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
          isLoading={isLoading}
          data-test-subj="importSavedObjectsImportBtn"
        >
          <FormattedMessage
            id="kbn.management.objects.objectsTable.flyout.import.confirmButtonLabel"
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
              id="kbn.management.objects.objectsTable.flyout.import.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{confirmButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderSubheader() {
    if (
      this.state.isLoading ||
      this.state.wasImportSuccessful
    ) {
      return null;
    }

    let legacyFileWarning;
    if (this.state.isLegacyFile) {
      legacyFileWarning = (<EuiCallOut
        title={(
          <FormattedMessage
            id="kbn.management.objects.objectsTable.flyout.legacyFileUsedTitle"
            defaultMessage="Importing .json files is deprecated"
          />
        )}
        color="warning"
        iconType="help"
      />);
    }

    let indexPatternConflictsWarning;
    if (this.hasUnmatchedReferences) {
      indexPatternConflictsWarning = (
        <EuiCallOut
          title={(
            <FormattedMessage
              id="kbn.management.objects.objectsTable.flyout.indexPatternConflictsTitle"
              defaultMessage="Index Pattern Conflicts"
            />
          )}
          color="warning"
          iconType="help"
        >
          <p>
            <FormattedMessage
              id="kbn.management.objects.objectsTable.flyout.indexPatternConflictsDescription"
              defaultMessage="The following saved objects use index patterns that do not exist.
              Please select the index patterns you&apos;d like re-associated with
              them. You can {indexPatternLink} if necessary."
              values={{
                indexPatternLink: (
                  <EuiLink href={this.props.newIndexPatternUrl}>
                    <FormattedMessage
                      id="kbn.management.objects.objectsTable.flyout.indexPatternConflictsCalloutLinkText"
                      defaultMessage="create a new index pattern"
                    />
                  </EuiLink>
                )
              }}
            />
          </p>
        </EuiCallOut>);
    }

    if (!legacyFileWarning && !indexPatternConflictsWarning) {
      return null;
    }

    return (
      <Fragment>
        {legacyFileWarning &&
          <span>
            <EuiSpacer size="s" />
            {legacyFileWarning}
          </span>
        }
        {indexPatternConflictsWarning &&
          <span>
            <EuiSpacer size="s" />
            {indexPatternConflictsWarning}
          </span>
        }
      </Fragment>
    );
  }

  overwriteConfirmed() {
    this.state.conflictingRecord.done(true);
  }

  overwriteSkipped() {
    this.state.conflictingRecord.done(false);
  }

  render() {
    const { close, intl } = this.props;

    let confirmOverwriteModal;
    if (this.state.conflictingRecord) {
      confirmOverwriteModal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={intl.formatMessage(
              {
                id: 'kbn.management.objects.objectsTable.flyout.confirmOverwriteTitle',
                defaultMessage: 'Overwrite {type}?'
              },
              { type: this.state.conflictingRecord.type }
            )}
            cancelButtonText={intl.formatMessage(
              {
                id: 'kbn.management.objects.objectsTable.flyout.confirmOverwriteCancelButtonText',
                defaultMessage: 'Cancel',
              },
            )}
            confirmButtonText={intl.formatMessage(
              {
                id: 'kbn.management.objects.objectsTable.flyout.confirmOverwriteOverwriteButtonText',
                defaultMessage: 'Overwrite',
              },
            )}
            onCancel={this.overwriteSkipped.bind(this)}
            onConfirm={this.overwriteConfirmed.bind(this)}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              <FormattedMessage
                id="kbn.management.objects.objectsTable.flyout.confirmOverwriteBody"
                defaultMessage="Are you sure you want to overwrite {title}?"
                values={{ title: this.state.conflictingRecord.title }}
              />
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>);
    }

    return (
      <EuiFlyout onClose={close} size="s">
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="kbn.management.objects.objectsTable.flyout.importSavedObjectTitle"
                defaultMessage="Import saved objects"
              />
            </h2>
          </EuiTitle>
          {this.renderSubheader()}
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {this.renderError()}
          {this.renderBody()}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>{this.renderFooter()}</EuiFlyoutFooter>
        {confirmOverwriteModal}
      </EuiFlyout>
    );
  }
}

export const Flyout = injectI18n(FlyoutUI);
