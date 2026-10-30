/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EntryLevel, GeneralAccessLevel } from '@kbn/access-control';

export interface LevelCopy {
  label: string;
  description: string;
}

/**
 * Consumer wording for the access panel. Each consumer names its own levels: a connector's `use`
 * level is "Can run", for example.
 */
export interface AccessCopy {
  /** Lowercase singular noun for the object, for example "connector". */
  objectNoun: string;
  generalAccess: Partial<Record<GeneralAccessLevel, LevelCopy>>;
  entryLevels: Partial<Record<EntryLevel, LevelCopy>>;
  /** Short verb phrase per operation for the read-only summary, for example "Run". */
  operations?: Record<string, string>;
}

const DEFAULT_GENERAL_ACCESS: Record<GeneralAccessLevel, LevelCopy> = {
  none: {
    label: i18n.translate('accessControlUi.generalAccess.none.label', {
      defaultMessage: 'Only people with access',
    }),
    description: i18n.translate('accessControlUi.generalAccess.none.description', {
      defaultMessage: 'Only the owner and the people listed below can find it.',
    }),
  },
  view: {
    label: i18n.translate('accessControlUi.generalAccess.view.label', {
      defaultMessage: 'Everyone in this space can view',
    }),
    description: i18n.translate('accessControlUi.generalAccess.view.description', {
      defaultMessage: 'Everyone with access to the space can find and view it.',
    }),
  },
  use: {
    label: i18n.translate('accessControlUi.generalAccess.use.label', {
      defaultMessage: 'Everyone in this space can use',
    }),
    description: i18n.translate('accessControlUi.generalAccess.use.description', {
      defaultMessage:
        'Everyone with access to the space can use it. Only people with access can edit it.',
    }),
  },
  edit: {
    label: i18n.translate('accessControlUi.generalAccess.edit.label', {
      defaultMessage: 'Everyone in this space can edit',
    }),
    description: i18n.translate('accessControlUi.generalAccess.edit.description', {
      defaultMessage: 'Everyone with access to the space can use and edit it.',
    }),
  },
};

const DEFAULT_ENTRY_LEVELS: Record<EntryLevel, LevelCopy> = {
  view: {
    label: i18n.translate('accessControlUi.entryLevel.view.label', { defaultMessage: 'Can view' }),
    description: '',
  },
  use: {
    label: i18n.translate('accessControlUi.entryLevel.use.label', { defaultMessage: 'Can use' }),
    description: '',
  },
  edit: {
    label: i18n.translate('accessControlUi.entryLevel.edit.label', { defaultMessage: 'Can edit' }),
    description: '',
  },
  manage: {
    label: i18n.translate('accessControlUi.entryLevel.manage.label', {
      defaultMessage: 'Can manage',
    }),
    description: '',
  },
};

export const getGeneralAccessCopy = (copy: AccessCopy, level: GeneralAccessLevel) =>
  copy.generalAccess[level] ?? DEFAULT_GENERAL_ACCESS[level];

export const getEntryLevelCopy = (copy: AccessCopy, level: EntryLevel) =>
  copy.entryLevels[level] ?? DEFAULT_ENTRY_LEVELS[level];
