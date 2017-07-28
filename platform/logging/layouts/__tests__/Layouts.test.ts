import * as mockSchema from '../../../lib/schema';
import { JsonLayout } from '../JsonLayout';
import { PatternLayout } from '../PatternLayout';
import { Layouts } from '../Layouts';

test('`createConfigSchema()` creates correct schema for `pattern` layout.', () => {
  const layoutsSchema = Layouts.createConfigSchema(mockSchema);
  const validConfigWithOptional = { kind: 'pattern' };
  expect(layoutsSchema.validate(validConfigWithOptional)).toEqual({
    kind: 'pattern',
    pattern: undefined,
    highlight: undefined
  });

  const validConfig = {
    kind: 'pattern',
    pattern: '{message}',
    highlight: true
  };
  expect(layoutsSchema.validate(validConfig)).toEqual({
    kind: 'pattern',
    pattern: '{message}',
    highlight: true
  });

  const wrongConfig2 = { kind: 'pattern', pattern: 1 };
  expect(() => layoutsSchema.validate(wrongConfig2)).toThrow();
});

test('`createConfigSchema()` creates correct schema for `json` layout.', () => {
  const layoutsSchema = Layouts.createConfigSchema(mockSchema);

  const validConfig = { kind: 'json' };
  expect(layoutsSchema.validate(validConfig)).toEqual({ kind: 'json' });
});

test('`create()` creates correct layout.', () => {
  const patternLayout = Layouts.create({
    kind: 'pattern',
    pattern: '[{timestamp}][{level}][{context}] {message}',
    highlight: false
  });
  expect(patternLayout).toBeInstanceOf(PatternLayout);

  const jsonLayout = Layouts.create({ kind: 'json' });
  expect(jsonLayout).toBeInstanceOf(JsonLayout);
});
