/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DuplicateTitleCalloutProps {
  title: string;
  entityName: string;
}

const getI18nTexts = ({ title, entityName }: { title: string; entityName: string }) => ({
  title: i18n.translate('contentManagement.inspector.duplicateTitleLabel', {
    defaultMessage: 'This {entityName} already exists.',
    values: {
      entityName,
    },
  }),
  description: i18n.translate('contentManagement.inspector.duplicateTitleDescription', {
    defaultMessage: "Saving '{title}' creates a duplicate title.",
    values: {
      title,
    },
  }),
});

export const DuplicateTitleCallout = ({ title, entityName }: DuplicateTitleCalloutProps) => {
  const i18nTexts = useMemo(() => getI18nTexts({ title, entityName }), [entityName, title]);

  return (
    <EuiCallOut title={i18nTexts.title} color="warning" data-test-subj="titleDuplicateWarnMsg">
      <p>{i18nTexts.description}</p>
    </EuiCallOut>
  );
};
