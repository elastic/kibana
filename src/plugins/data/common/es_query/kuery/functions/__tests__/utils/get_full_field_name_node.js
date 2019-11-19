/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { nodeTypes } from '../../../node_types';
import { getFullFieldNameNode } from '../../utils/get_full_field_name_node';
import { fields } from '../../../../../index_patterns/mocks';

describe('getFullFieldNameNode', function () {
  let indexPattern;

  beforeEach(() => {
    indexPattern = {
      fields,
    };
  });

  it('should return unchanged name node if no nested path is passed in', () => {
    const nameNode = nodeTypes.literal.buildNode('notNested');
    const result = getFullFieldNameNode(nameNode, indexPattern);
    expect(result).to.eql(nameNode);
  });

  it('should add the nested path if it is valid according to the index pattern', () => {
    const nameNode = nodeTypes.literal.buildNode('child');
    const result = getFullFieldNameNode(nameNode, indexPattern, 'nestedField');
    expect(result).to.eql(nodeTypes.literal.buildNode('nestedField.child'));
  });

  it('should throw an error if a path is provided for a non-nested field', () => {
    const nameNode = nodeTypes.literal.buildNode('os');
    expect(getFullFieldNameNode)
      .withArgs(nameNode, indexPattern, 'machine')
      .to
      .throwException(/machine.os is not a nested field but is in nested group "machine" in the KQL expression/);
  });

  it('should throw an error if a nested field is not passed with a path', () => {
    const nameNode = nodeTypes.literal.buildNode('nestedField.child');
    expect(getFullFieldNameNode)
      .withArgs(nameNode, indexPattern)
      .to
      .throwException(/nestedField.child is a nested field, but is not in a nested group in the KQL expression./);
  });

  it('should throw an error if a nested field is passed with the wrong path', () => {
    const nameNode = nodeTypes.literal.buildNode('nestedChild.doublyNestedChild');
    expect(getFullFieldNameNode)
      .withArgs(nameNode, indexPattern, 'nestedField')
      .to
      // eslint-disable-next-line max-len
      .throwException(/Nested field nestedField.nestedChild.doublyNestedChild is being queried with the incorrect nested path. The correct path is nestedField.nestedChild/);
  });

  it('should skip error checking for wildcard names', () => {
    const nameNode = nodeTypes.wildcard.buildNode('nested*');
    const result = getFullFieldNameNode(nameNode, indexPattern);
    expect(result).to.eql(nameNode);
  });

  it('should skip error checking if no index pattern is passed in', () => {
    const nameNode = nodeTypes.literal.buildNode('os');
    expect(getFullFieldNameNode)
      .withArgs(nameNode, null, 'machine')
      .to
      .not
      .throwException();

    const result = getFullFieldNameNode(nameNode, null, 'machine');
    expect(result).to.eql(nodeTypes.literal.buildNode('machine.os'));
  });

});
