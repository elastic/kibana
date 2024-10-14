/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContactCardEmbeddable } from './contact_card_embeddable';

export class ContactCardExportableEmbeddable extends ContactCardEmbeddable {
  public getInspectorAdapters = () => {
    return {
      tables: {
        allowCsvExport: true,
        tables: {
          layer1: {
            type: 'datatable',
            columns: [
              { id: 'firstName', name: 'First Name' },
              { id: 'originalLastName', name: 'Last Name' },
            ],
            rows: [
              {
                firstName: this.getInput().firstName,
                orignialLastName: this.getInput().lastName,
              },
            ],
          },
        },
      },
    };
  };
}

export const CONTACT_EXPORTABLE_USER_TRIGGER = 'CONTACT_EXPORTABLE_USER_TRIGGER';
