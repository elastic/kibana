/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from '../../node_types';
import { fields } from '../../../filters/stubs';
import { DataViewBase } from '../../..';
import { getFullFieldNameNode } from './get_full_field_name_node';

jest.mock('../../grammar');

describe('getFullFieldNameNode', function () {
  let indexPattern: DataViewBase;

  beforeEach(() => {
    indexPattern = {
      fields,
      title: 'dataView',
    };
  });

  test('should return unchanged name node if no nested path is passed in', () => {
    const nameNode = nodeTypes.literal.buildNode('notNested');
    const result = getFullFieldNameNode(nameNode, indexPattern);

    expect(result).toEqual(nameNode);
  });

  test('should add the nested path if test is valid according to the index pattern', () => {
    const nameNode = nodeTypes.literal.buildNode('child');
    const result = getFullFieldNameNode(nameNode, indexPattern, 'nestedField');

    expect(result).toEqual(nodeTypes.literal.buildNode('nestedField.child'));
  });

  test('should throw an error if a path is provided for a non-nested field', () => {
    const nameNode = nodeTypes.literal.buildNode('os');
    expect(() => getFullFieldNameNode(nameNode, indexPattern, 'machine')).toThrowError(
      /machine.os is not a nested field but is in nested group "machine" in the KQL expression/
    );
  });

  test('should throw an error if a nested field is not passed with a path', () => {
    const nameNode = nodeTypes.literal.buildNode('nestedField.child');

    expect(() => getFullFieldNameNode(nameNode, indexPattern)).toThrowError(
      /nestedField.child is a nested field, but is not in a nested group in the KQL expression./
    );
  });

  test('should throw an error if a nested field is passed with the wrong path', () => {
    const nameNode = nodeTypes.literal.buildNode('nestedChild.doublyNestedChild');

    expect(() => getFullFieldNameNode(nameNode, indexPattern, 'nestedField')).toThrowError(
      /Nested field nestedField.nestedChild.doublyNestedChild is being queried with the incorrect nested path. The correct path is nestedField.nestedChild/
    );
  });

  test('should skip error checking for wildcard names', () => {
    const nameNode = nodeTypes.wildcard.buildNode('nested*');
    const result = getFullFieldNameNode(nameNode, indexPattern);

    expect(result).toEqual(nameNode);
  });

  test('should skip error checking if no index pattern is passed in', () => {
    const nameNode = nodeTypes.literal.buildNode('os');
    expect(() => getFullFieldNameNode(nameNode, undefined, 'machine')).not.toThrowError();

    const result = getFullFieldNameNode(nameNode, undefined, 'machine');
    expect(result).toEqual(nodeTypes.literal.buildNode('machine.os'));
  });
});
