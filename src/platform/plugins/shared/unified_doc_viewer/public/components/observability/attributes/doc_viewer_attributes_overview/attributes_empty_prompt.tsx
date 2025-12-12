/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const AttributesEmptyPrompt = () => (
  <EuiEmptyPrompt
    layout="horizontal"
    body={
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(
            'unifiedDocViewer.docView.attributes.accordion.noFieldsMessage.noFieldsLabel',
            {
              defaultMessage: 'No attributes fields found.',
            }
          )}
        </p>
        <>
          <strong>
            {i18n.translate(
              'unifiedDocViewer.docView.attributes.accordion.noFieldsMessage.tryText',
              {
                defaultMessage: 'Try:',
              }
            )}
          </strong>
          <ul>
            <li>
              {i18n.translate(
                'unifiedDocViewer.docView.attributes.accordion.noFieldsMessage.fieldTypeFilterBullet',
                {
                  defaultMessage: 'Using different field filters if applicable.',
                }
              )}
            </li>
          </ul>
        </>
      </EuiText>
    }
    data-test-subj="attributesAccordionEmptyPrompt"
  />
);
