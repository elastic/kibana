/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ImportReferencedObjectsResponse } from '@kbn/saved-objects-management-plugin/common';

export const importReferencedObjectsStrings = {
  getMenuItemLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.menuItemLabel', {
      defaultMessage: 'Import with referenced objects',
    }),
  getFlyoutTitle: () =>
    i18n.translate('dashboard.importReferencedObjects.flyoutTitle', {
      defaultMessage: 'Import with referenced objects',
    }),
  getTechnicalPreviewLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.technicalPreviewLabel', {
      defaultMessage: 'Technical preview',
    }),
  getTechnicalPreviewTooltip: () =>
    i18n.translate('dashboard.importReferencedObjects.technicalPreviewTooltip', {
      defaultMessage:
        'This functionality is in technical preview and may be changed or removed in a future release.',
    }),
  getDescription: () =>
    i18n.translate('dashboard.importReferencedObjects.description', {
      defaultMessage:
        'Import a file exported with "Export with referenced objects". Each object is checked against its API before it is written.',
    }),
  getFilePickerLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.filePickerLabel', {
      defaultMessage: 'Export file',
    }),
  getInvalidFileError: () =>
    i18n.translate('dashboard.importReferencedObjects.invalidFileError', {
      defaultMessage: "The file isn't an export with referenced objects.",
    }),
  getObjectsInFile: (count: number) =>
    i18n.translate('dashboard.importReferencedObjects.objectsInFile', {
      defaultMessage: '{count, plural, one {# object} other {# objects}} in the file.',
      values: { count },
    }),
  getModeLegend: () =>
    i18n.translate('dashboard.importReferencedObjects.modeLegend', {
      defaultMessage: 'When an object already exists',
    }),
  getRequestActionLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.requestActionLabel', {
      defaultMessage: 'Leave it unchanged and report the conflict',
    }),
  getOverwriteLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.overwriteLabel', {
      defaultMessage: 'Overwrite existing objects',
    }),
  getNewCopiesLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.newCopiesLabel', {
      defaultMessage: 'Create new objects with new IDs',
    }),
  getNewCopiesHelpText: () =>
    i18n.translate('dashboard.importReferencedObjects.newCopiesHelpText', {
      defaultMessage:
        'Some objects that already exist in this space, such as data views and tags, are reused instead of copied.',
    }),
  getErrorTitle: () =>
    i18n.translate('dashboard.importReferencedObjects.errorTitle', {
      defaultMessage: 'The file could not be imported',
    }),
  getGenericErrorText: () =>
    i18n.translate('dashboard.importReferencedObjects.genericErrorText', {
      defaultMessage: 'Something went wrong. Try again, or check the Kibana server logs.',
    }),
  getResultsSummary: (imported: number, total: number, reused: number) =>
    i18n.translate('dashboard.importReferencedObjects.resultsSummary', {
      defaultMessage:
        '{imported} of {total} objects imported{reused, plural, =0 {} other {, # reused}}',
      values: { imported, total, reused },
    }),
  getReusedTitle: () =>
    i18n.translate('dashboard.importReferencedObjects.reusedTitle', {
      defaultMessage: 'Reused from this space',
    }),
  getReusedDescription: () =>
    i18n.translate('dashboard.importReferencedObjects.reusedDescription', {
      defaultMessage:
        'These objects already exist in this space, so the new copies point to them instead of copying them.',
    }),
  getWarningsTitle: (count: number) =>
    i18n.translate('dashboard.importReferencedObjects.warningsTitle', {
      defaultMessage:
        '{count, plural, one {# referenced object is missing} other {# referenced objects are missing}}',
      values: { count },
    }),
  getWarningsDescription: () =>
    i18n.translate('dashboard.importReferencedObjects.warningsDescription', {
      defaultMessage:
        'The objects that point to them were imported anyway, and the panels that use them show an error.',
    }),
  getMissingReferenceText: ({
    from,
    reference,
  }: ImportReferencedObjectsResponse['warnings'][number]) =>
    i18n.translate('dashboard.importReferencedObjects.missingReferenceText', {
      defaultMessage:
        '{fromType} {fromId} points to {referenceType} {referenceId}, which is in neither the file nor this space.',
      values: {
        fromType: from.type,
        fromId: from.id,
        referenceType: reference.type,
        referenceId: reference.id,
      },
    }),
  getResultsTableCaption: () =>
    i18n.translate('dashboard.importReferencedObjects.resultsTableCaption', {
      defaultMessage: 'Import results',
    }),
  getTypeColumnName: () =>
    i18n.translate('dashboard.importReferencedObjects.typeColumnName', {
      defaultMessage: 'Type',
    }),
  getIdColumnName: () =>
    i18n.translate('dashboard.importReferencedObjects.idColumnName', {
      defaultMessage: 'ID',
    }),
  getDestinationIdColumnName: () =>
    i18n.translate('dashboard.importReferencedObjects.destinationIdColumnName', {
      defaultMessage: 'ID in this space',
    }),
  getStatusColumnName: () =>
    i18n.translate('dashboard.importReferencedObjects.statusColumnName', {
      defaultMessage: 'Result',
    }),
  getStatusLabel: (status: ImportReferencedObjectsResponse['results'][number]['status']) =>
    ({
      created: i18n.translate('dashboard.importReferencedObjects.status.created', {
        defaultMessage: 'Created',
      }),
      overwritten: i18n.translate('dashboard.importReferencedObjects.status.overwritten', {
        defaultMessage: 'Overwritten',
      }),
      reused: i18n.translate('dashboard.importReferencedObjects.status.reused', {
        defaultMessage: 'Reused',
      }),
      conflict: i18n.translate('dashboard.importReferencedObjects.status.conflict', {
        defaultMessage: 'Conflict',
      }),
      skipped: i18n.translate('dashboard.importReferencedObjects.status.skipped', {
        defaultMessage: 'Skipped',
      }),
      error: i18n.translate('dashboard.importReferencedObjects.status.error', {
        defaultMessage: 'Error',
      }),
    }[status]),
  getConflictMessage: () =>
    i18n.translate('dashboard.importReferencedObjects.conflictMessage', {
      defaultMessage: 'Already exists, left unchanged.',
    }),
  getConflictsTitle: (count: number) =>
    i18n.translate('dashboard.importReferencedObjects.conflictsTitle', {
      defaultMessage:
        '{count, plural, one {# object already exists. Choose what to do with it.} other {# objects already exist. Choose what to do with each one.}}',
      values: { count },
    }),
  getConflictsDescription: () =>
    i18n.translate('dashboard.importReferencedObjects.conflictsDescription', {
      defaultMessage:
        'Objects without a conflict have been imported. Overwrite replaces the existing object with the one in the file, and Skip leaves it unchanged.',
    }),
  getOverwriteActionLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.overwriteActionLabel', {
      defaultMessage: 'Overwrite',
    }),
  getSkipActionLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.skipActionLabel', {
      defaultMessage: 'Skip',
    }),
  getFinishButtonLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.finishButtonLabel', {
      defaultMessage: 'Finish import',
    }),
  getCancelButtonLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  getCloseButtonLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.closeButtonLabel', {
      defaultMessage: 'Close',
    }),
  getImportButtonLabel: () =>
    i18n.translate('dashboard.importReferencedObjects.importButtonLabel', {
      defaultMessage: 'Import',
    }),
};
