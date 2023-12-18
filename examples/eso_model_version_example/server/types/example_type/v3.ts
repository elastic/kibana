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
  flag2?: boolean;
}

// This is a new attribute added in V3
export interface EsoModelVersionExampleOptions2 {
  foo?: string;
  bar?: string;
}

export interface EsoModelVersionExampleSecretData {
  a: string;
  b?: string;
}

// These are the attributes of V3 of our saved object.
export interface EsoModelVersionExample {
  name: string; // Display name attribute. Not part of AAD
  // We have removed 'toBeRemoved'
  aadField1?: EsoModelVersionExampleOptions1; // Optional attribute that is part of AAD.
  aadField2?: EsoModelVersionExampleOptions2; // Optional attribute that is part of AAD.
  aadExcludedField?: string; // Optional attribute that is NOT part of AAD.
  secrets: EsoModelVersionExampleSecretData; // An encrypted attribute.
}

// This is the encryption definition for V3 of our saved object.
// It is important to keep this definition so it can be used with the new
// createModelVersion wrapper when newer model versions are defined.
export const EsoModelVersionExampleTypeRegistration: EncryptedSavedObjectTypeRegistration = {
  type: EXAMPLE_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['secrets']),
  attributesToExcludeFromAAD: new Set(['name', 'aadExcludedField']), // aadField1 and aadField2 are included in AAD, but not name, or aadExcludedField
};

// This is just some static information used to generate a document
// for this specific model version. Otherwise, creating a saved object
// will always create the latest model version.
export const ESO_MV_RAW_DOC = {
  index: '.kibana',
  id: 'eso_model_version_example:4b43a8b0-7dd7-11ee-8355-7d13444c2fd7',
  document: {
    eso_model_version_example: {
      name: 'MV3 Test',
      aadField1: {
        flag1: false,
        flag2: true,
      },
      aadField2: {
        foo: 'bar',
        bar: 'foo',
      },
      aadExcludedField: 'this is a field excluded from AAD',
      secrets:
        'YYtHdisdq44Mvd9VdUui62hM8OowEgkuWSfidWq11lG4aXYR61tf+G+BlbwO6rqKPbFWK238Vn1tP+zceeiCofDqEZkViinT1nGDGjArEEsmIUlDtj5IdaY6boMGRzUJ+37viUrISFXMVV9n2qVMp7IYb2BGkAb3hyh4+ZO9SPTbrKhkcpKgpLs3CEvmfsgeW/Tkxh+F65uK2RShkgLoPy62JI35XUz1paop+zSQ90yPL9ysoQ==',
    },
    type: 'eso_model_version_example',
    references: [],
    managed: false,
    namespaces: ['default'],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.3.0',
    updated_at: '2023-11-08T01:36:52.923Z',
    created_at: '2023-11-08T01:36:52.923Z',
  },
};
