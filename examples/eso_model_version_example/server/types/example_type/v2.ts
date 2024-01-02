/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const EXAMPLE_SAVED_OBJECT_TYPE = 'eso_model_version_example';

// V2 adds a new sub-field "flag2"
export interface EsoModelVersionExampleOptions1 {
  flag1?: boolean;
  flag2?: boolean;
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
  aadExcludedField?: string; // Optional attribute that is NOT part of AAD.
  secrets: EsoModelVersionExampleSecretData; // An encrypted attribute.
}

// This is the encryption definition for V2 of our saved object.
// It is important to keep this definition so it can be used with the new
// createModelVersion wrapper when newer model versions are defined.
export const EsoModelVersionExampleTypeRegistration: EncryptedSavedObjectTypeRegistration = {
  type: EXAMPLE_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['secrets']),
  attributesToExcludeFromAAD: new Set(['name', 'toBeRemoved', 'aadExcludedField']), // aadField1 is included in AAD, but not name, toBeRemoved, or aadExcludedField
};

// This is just some static information used to generate a document
// for this specific model version. Otherwise, creating a saved object
// will always create the latest model version.
export const ESO_MV_RAW_DOC = {
  index: '.kibana',
  id: 'eso_model_version_example:52868e00-7dd5-11ee-bc21-35484912189c',
  document: {
    eso_model_version_example: {
      name: 'MV2 Test',
      toBeRemoved: 'nothing to see here',
      aadField1: {
        flag1: true,
        flag2: true,
      },
      aadExcludedField: 'this will not be used in AAD',
      secrets:
        'uXBOQpvkI9+lAcfJ52yQAroKIIj+YBT9Ym3IpH1nmPBj2u51tZ07tnPQ3EtO379zHzGOMu+9Da3+bVmDbtsL0z/YrDad3f0o0XSnuEDvmPIVWqC0EwKguik+t63s5LrFvp4r+X3OmsG+jIISx/PXXgLl/8NiWa/urjp649lTGo/k4QvSHyQ4egeM1LjRihFSBFEZkQljF6SJLFocuDlQb8GHkVtgp0pKKfrZu0mI8Q==',
    },
    type: 'eso_model_version_example',
    references: [],
    managed: false,
    namespaces: ['default'],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.2.0',
    updated_at: '2023-11-08T01:22:46.112Z',
    created_at: '2023-11-08T01:22:46.112Z',
  },
};
