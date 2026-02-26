/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { DynamicStepContextSchema } from '@kbn/workflows';
import { getShape } from '@kbn/workflows/common/utils/zod';
import { z } from '@kbn/zod/v4';
import {
  extendContextWithTemplateLocals,
  getContextSchemaWithTemplateLocals,
} from './extend_context_with_template_locals';
import { getScalarValueAtOffset } from '../../../../common/lib/yaml/get_scalar_value_at_offset';

jest.mock('../../../../common/lib/yaml/get_scalar_value_at_offset');

describe('extendContextWithTemplateLocals', () => {
  it('extends schema with assign variable name', () => {
    const template = '{% assign myVar = "hello" %} {{ myVar }}';
    const extended = extendContextWithTemplateLocals(
      DynamicStepContextSchema,
      template,
      template.length
    );
    const shape = getShape(extended);
    expect(shape).toHaveProperty('myVar');
  });

  it('infers string type for assign with string literal', () => {
    const template = '{% assign s = "text" %} {{ s }}';
    const extended = extendContextWithTemplateLocals(
      DynamicStepContextSchema,
      template,
      template.length
    );
    const shape = getShape(extended);
    expect(shape.s).toBeDefined();
    expect(shape.s instanceof z.ZodString).toBe(true);
  });

  it('infers string type for capture variables', () => {
    const template = '{% capture cap %}body{% endcapture %} {{ cap }}';
    const extended = extendContextWithTemplateLocals(
      DynamicStepContextSchema,
      template,
      template.length
    );
    const shape = getShape(extended);
    expect(shape.cap).toBeDefined();
    expect(shape.cap instanceof z.ZodString).toBe(true);
  });

  it('infers number type for assign with number literal', () => {
    const template = '{% assign n = 42 %} {{ n }}';
    const extended = extendContextWithTemplateLocals(
      DynamicStepContextSchema,
      template,
      template.length
    );
    const shape = getShape(extended);
    expect(shape.n).toBeDefined();
    expect(shape.n instanceof z.ZodNumber).toBe(true);
  });

  it('extends schema with for-loop variable and forloop', () => {
    const template = '{% for item in items %} {{ item }} {{ forloop.index }} {% endfor %}';
    const bodyStart = template.indexOf(' {{ item }}');
    const offsetInBody = bodyStart + 3;
    const extended = extendContextWithTemplateLocals(
      DynamicStepContextSchema,
      template,
      offsetInBody
    );
    const shape = getShape(extended);
    expect(shape).toHaveProperty('item');
    expect(shape).toHaveProperty('forloop');
  });

  it('returns base schema when no template locals at offset', () => {
    const template = '{{ workflow.id }}';
    const extended = extendContextWithTemplateLocals(DynamicStepContextSchema, template, 0);
    expect(extended).toBe(DynamicStepContextSchema);
  });
});

describe('getContextSchemaWithTemplateLocals', () => {
  const mockGetScalarValueAtOffset = getScalarValueAtOffset as jest.MockedFunction<
    typeof getScalarValueAtOffset
  >;

  it('returns base schema when scalar at offset is null', () => {
    mockGetScalarValueAtOffset.mockReturnValue(null);
    const doc = {} as Document;
    expect(getContextSchemaWithTemplateLocals(doc, 0, DynamicStepContextSchema)).toBe(
      DynamicStepContextSchema
    );
  });

  it('returns base schema when scalar value is not a string', () => {
    mockGetScalarValueAtOffset.mockReturnValue({ value: 42, range: [0, 2] } as any);
    const doc = {} as Document;
    expect(getContextSchemaWithTemplateLocals(doc, 0, DynamicStepContextSchema)).toBe(
      DynamicStepContextSchema
    );
  });

  it('extends schema when offset is inside a plain scalar (template)', () => {
    const templateString = '{% assign myVar = "hello" %} {{ myVar }}';
    const scalarStart = 50;
    const valueEnd = scalarStart + templateString.length;
    mockGetScalarValueAtOffset.mockReturnValue({
      value: templateString,
      type: 'PLAIN',
      range: [scalarStart, valueEnd, valueEnd],
    } as any);
    const offsetInDoc = scalarStart + templateString.indexOf(' {{ myVar }}') + 1;
    const doc = {} as Document;
    const extended = getContextSchemaWithTemplateLocals(doc, offsetInDoc, DynamicStepContextSchema);
    const shape = getShape(extended);
    expect(shape).toHaveProperty('myVar');
    expect(mockGetScalarValueAtOffset).toHaveBeenCalledWith(doc, offsetInDoc);
  });

  it('adjusts offset for double-quoted scalars', () => {
    const templateString = '{% assign x = 1 %}{{ x }}';
    const scalarStart = 10;
    const valueEnd = scalarStart + 1 + templateString.length;
    const nodeEnd = valueEnd + 1;
    mockGetScalarValueAtOffset.mockReturnValue({
      value: templateString,
      type: 'QUOTE_DOUBLE',
      range: [scalarStart, valueEnd, nodeEnd],
    } as any);
    // Document offset pointing to the {{ x }} region (after quote adjustment)
    const offsetInDoc = scalarStart + 1 + templateString.indexOf('{{ x }}') + 4;
    const doc = {} as Document;
    const extended = getContextSchemaWithTemplateLocals(doc, offsetInDoc, DynamicStepContextSchema);
    const shape = getShape(extended);
    expect(shape).toHaveProperty('x');
  });

  it('adjusts offset for single-quoted scalars', () => {
    const templateString = '{% assign y = 2 %}{{ y }}';
    const scalarStart = 5;
    const valueEnd = scalarStart + 1 + templateString.length;
    const nodeEnd = valueEnd + 1;
    mockGetScalarValueAtOffset.mockReturnValue({
      value: templateString,
      type: 'QUOTE_SINGLE',
      range: [scalarStart, valueEnd, nodeEnd],
    } as any);
    const offsetInDoc = scalarStart + 1 + templateString.indexOf('{{ y }}') + 4;
    const doc = {} as Document;
    const extended = getContextSchemaWithTemplateLocals(doc, offsetInDoc, DynamicStepContextSchema);
    const shape = getShape(extended);
    expect(shape).toHaveProperty('y');
  });

  it('extends schema for block literal scalars', () => {
    const templateString = '{% assign z = 3 %}{{ z }}';
    const scalarStart = 10;
    mockGetScalarValueAtOffset.mockReturnValue({
      value: templateString,
      type: 'BLOCK_LITERAL',
      range: [scalarStart, scalarStart + 50, scalarStart + 55],
    } as any);
    const doc = {} as Document;
    const result = getContextSchemaWithTemplateLocals(
      doc,
      scalarStart + 30,
      DynamicStepContextSchema
    );
    const shape = getShape(result);
    expect(shape).toHaveProperty('z');
  });

  it('extends schema for block folded scalars', () => {
    const templateString = '{% assign w = 4 %}{{ w }}';
    const scalarStart = 10;
    mockGetScalarValueAtOffset.mockReturnValue({
      value: templateString,
      type: 'BLOCK_FOLDED',
      range: [scalarStart, scalarStart + 50, scalarStart + 55],
    } as any);
    const doc = {} as Document;
    const result = getContextSchemaWithTemplateLocals(
      doc,
      scalarStart + 30,
      DynamicStepContextSchema
    );
    const shape = getShape(result);
    expect(shape).toHaveProperty('w');
  });

  it('returns base schema when offsetInTemplate is out of bounds', () => {
    const templateString = '{{ x }}';
    const scalarStart = 10;
    const valueEnd = scalarStart + 1 + templateString.length;
    const nodeEnd = valueEnd + 1;
    mockGetScalarValueAtOffset.mockReturnValue({
      value: templateString,
      type: 'QUOTE_DOUBLE',
      range: [scalarStart, valueEnd, nodeEnd],
    } as any);
    // Offset at the opening quote itself -- offsetInTemplate would be -1, out of bounds
    const doc = {} as Document;
    const result = getContextSchemaWithTemplateLocals(doc, scalarStart, DynamicStepContextSchema);
    expect(result).toBe(DynamicStepContextSchema);
  });

  it.each([
    '"a | b"',
    "'a | b'",
    "'a | b' | upcase",
    "'a | b' | json_parse | upcase",
    "'a | b' | split: '| '",
  ])('should be resilient to pipe within RHS quoted strings: %s', (expression) => {
    const templateString = `{% assign x = ${expression} %}{{ x }}`;
    const scalarStart = 10;
    // For QUOTE_DOUBLE range[0] is the opening quote; the value starts at scalarStart + 1.
    const valueEnd = scalarStart + 1 + templateString.length;
    const nodeEnd = valueEnd + 1; // closing quote
    mockGetScalarValueAtOffset.mockReturnValue({
      value: templateString,
      type: 'QUOTE_DOUBLE',
      range: [scalarStart, valueEnd, nodeEnd],
    } as any);
    // Place the cursor inside the {{ x }} output tag so offsetInTemplate lands
    // after the assign and the pipe-in-quotes RHS is fully parsed.
    const offsetInContent = templateString.indexOf('{{ x }}') + 3;
    const offsetInDoc = scalarStart + 1 + offsetInContent;
    const doc = {} as Document;
    const result = getContextSchemaWithTemplateLocals(doc, offsetInDoc, DynamicStepContextSchema);
    const shape = getShape(result);
    expect(shape).toHaveProperty('x');
    expect(shape.x).toBeDefined();
    expect(shape.x instanceof z.ZodString).toBe(true);
  });
});
