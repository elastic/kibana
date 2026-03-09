/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../../common/lib/yaml', () => ({
  getStepNodesWithType: jest.fn(),
}));

jest.mock('../../widgets/workflow_yaml_editor/lib/get_indent_level', () => ({
  getIndentLevelFromLineNumber: jest.fn(),
}));

jest.mock('../../widgets/workflow_yaml_editor/lib/utils', () => ({
  getMonacoRangeFromYamlNode: jest.fn(),
}));

import { findInsertLineAfterLastStep, findStepRange } from './monaco_edit_utils';
import { getStepNodesWithType } from '../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../../widgets/workflow_yaml_editor/lib/get_indent_level';
import { getMonacoRangeFromYamlNode } from '../../widgets/workflow_yaml_editor/lib/utils';

const mockGetStepNodes = jest.mocked(getStepNodesWithType);
const mockGetIndentLevel = jest.mocked(getIndentLevelFromLineNumber);
const mockGetRange = jest.mocked(getMonacoRangeFromYamlNode);

const mockDocument = {} as any;
const mockModel = { getLineCount: jest.fn().mockReturnValue(20) } as any;

describe('monaco_edit_utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findStepRange', () => {
    it('returns null when step name not found', () => {
      mockGetStepNodes.mockReturnValue([{ get: jest.fn().mockReturnValue('other_step') } as any]);

      const result = findStepRange(mockDocument, mockModel, 'missing_step');

      expect(result).toBeNull();
    });

    it('returns null when range cannot be resolved', () => {
      const stepNode = { get: jest.fn().mockReturnValue('my_step') };
      mockGetStepNodes.mockReturnValue([stepNode as any]);
      mockGetRange.mockReturnValue(null as any);

      const result = findStepRange(mockDocument, mockModel, 'my_step');

      expect(result).toBeNull();
    });

    it('returns step range with correct line numbers and indent', () => {
      const stepNode = { get: jest.fn().mockReturnValue('my_step') };
      mockGetStepNodes.mockReturnValue([stepNode as any]);
      mockGetRange.mockReturnValue({
        startLineNumber: 3,
        endLineNumber: 7,
        startColumn: 1,
        endColumn: 20,
      } as any);
      mockGetIndentLevel.mockReturnValue(4);

      const result = findStepRange(mockDocument, mockModel, 'my_step');

      expect(result).toEqual({
        startLine: 3,
        endLine: 7,
        indentLevel: 4,
      });
      expect(mockGetIndentLevel).toHaveBeenCalledWith(mockModel, 3);
    });
  });

  describe('findInsertLineAfterLastStep', () => {
    it('returns end of file when no steps exist', () => {
      mockGetStepNodes.mockReturnValue([]);

      const result = findInsertLineAfterLastStep(mockDocument, mockModel);

      expect(result).toEqual({ lineNumber: 21, indentLevel: 2 });
    });

    it('returns line after last step', () => {
      const step1 = { get: jest.fn().mockReturnValue('step_1') };
      const step2 = { get: jest.fn().mockReturnValue('step_2') };
      mockGetStepNodes.mockReturnValue([step1 as any, step2 as any]);
      mockGetRange.mockReturnValue({
        startLineNumber: 10,
        endLineNumber: 15,
        startColumn: 1,
        endColumn: 20,
      } as any);
      mockGetIndentLevel.mockReturnValue(6);

      const result = findInsertLineAfterLastStep(mockDocument, mockModel);

      expect(result).toEqual({ lineNumber: 16, indentLevel: 6 });
      expect(mockGetRange).toHaveBeenCalledWith(mockModel, step2);
    });

    it('returns end of file when last step range cannot be resolved', () => {
      const step1 = { get: jest.fn().mockReturnValue('step_1') };
      mockGetStepNodes.mockReturnValue([step1 as any]);
      mockGetRange.mockReturnValue(null as any);

      const result = findInsertLineAfterLastStep(mockDocument, mockModel);

      expect(result).toEqual({ lineNumber: 21, indentLevel: 2 });
    });
  });
});
