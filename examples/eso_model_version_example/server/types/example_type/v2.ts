/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const EXAMPLE_SAVED_OBJECT_TYPE = 'eso_model_version_example';

export interface EsoModelVersionExampleOptions1 {
  flag1?: boolean;
}

// This is a new attribute added in V2
export interface EsoModelVersionExampleOptions2 {
  foo?: string;
  bar?: string;
}

// V2 adds a new encrypted sub-field "b"
export interface EsoModelVersionExampleSecretData {
  a: string;
  b?: string;
}

// These are the attributes of V2 of our saved object.
export interface EsoModelVersionExample {
  name: string; // Display name attribute. Not part of AAD
  toBeRemoved: string; // An attribute that will be removed in a later model version.
  aadField1?: EsoModelVersionExampleOptions1; // Optional attribute that is part of AAD.
  aadField2?: EsoModelVersionExampleOptions2; // Optional attribute that is part of AAD.
  aadExcludedField?: string; // Optional attribute that is NOT part of AAD.
  secrets: EsoModelVersionExampleSecretData; // An encrypted attribute.
}

// This is the encryption definition for V2 of our saved object.
// It is important to keep this definition so it can be used with the new
// createModelVersion wrapper when newer model versions are defined.
export const EsoModelVersionExampleTypeRegistration: EncryptedSavedObjectTypeRegistration = {
  type: EXAMPLE_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set(['aadField1']), // aadField1 is included in AAD, but not name, toBeRemoved, or aadExcludedField
};

// This is just some static information used to generate a document
// for this specific model version. Otherwise, creating a saved object
// will always create the latest model version.
//   secrets: {
//     a: 'this is a model version 2 object',
//     b: 'this is a new nested encrypted field',
//   }
export const ESO_MV_RAW_DOC = {
  index: '.kibana',
  id: 'eso_model_version_example:9495eb6f-e356-47f7-a5b9-dce395375cbe',
  document: {
    eso_model_version_example: {
      name: 'MV2 Test',
      toBeRemoved: 'nothing to see here',
      aadField1: {
        flag1: true,
      },
      aadExcludedField: 'this is a new field excluded from AAD',
      secrets:
        'yf9UJyLPfq5iN6oH1mhDQuGX9WRNUnbsN+YDsNDcbCHQAg4N9CC458s+3xwZG/Sm+0GO2o5v+JPUCbkBhuFCNybIdrrzWm00CwHscOYPA4yoLU3blyIMdMzRjClbkKyQNPANOVD7ST1xv5ZAqhujsFI3ascDEVCk+mfBIJbnwOPaohWvsLaMhc0igjpwAeadc8F0cGWg34Nkue0JoaUHxx8CdkComFnwQPK8BER+Wg==',
    },
    type: 'eso_model_version_example',
    references: [],
    managed: false,
    namespaces: ['default'],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.2.0',
    updated_at: '2023-12-18T18:13:06.568Z',
    created_at: '2023-12-18T18:13:06.568Z',
  },
};
