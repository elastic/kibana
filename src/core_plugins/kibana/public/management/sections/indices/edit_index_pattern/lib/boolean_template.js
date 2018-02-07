import React from 'react';
import {
  EuiHealth
} from '@elastic/eui';

export function booleanTemplate(value) {
  return value ? <EuiHealth color="success"/> : '';
}
