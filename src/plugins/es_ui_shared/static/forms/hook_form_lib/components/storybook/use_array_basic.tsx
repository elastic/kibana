/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { TextField } from '../../../components';
import { fieldValidators } from '../../../helpers';
import { UseField } from '../use_field';
import { UseArray } from '../use_array';

const { emptyField } = fieldValidators;

export function Basic() {
  return (
    <UseArray path="employees">
      {({ items, addItem, removeItem }) => {
        return (
          <>
            {items.map(({ id, path }) => {
              return (
                <EuiFlexGroup key={id} alignItems="center">
                  <EuiFlexItem>
                    <UseField
                      path={`${path}.name`}
                      config={{
                        label: 'Name',
                        validations: [{ validator: emptyField('A name is required.') }],
                      }}
                      component={TextField}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <UseField
                      path={`${path}.lastName`}
                      config={{
                        label: 'Last name',
                        validations: [{ validator: emptyField('A last name is required.') }],
                      }}
                      component={TextField}
                    />
                  </EuiFlexItem>
                  {items.length > 1 && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="minusInCircle"
                        onClick={() => removeItem(id)}
                        aria-label="Remove item"
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              );
            })}
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiButtonEmpty onClick={addItem}>Add employee</EuiButtonEmpty>
            </EuiFlexGroup>
          </>
        );
      }}
    </UseArray>
  );
}

Basic.storyName = 'Basic';
